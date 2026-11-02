import {createRidePlan} from './ride-compare.js';
export function isAtLeast21(dob,now=new Date()) {
  if(typeof dob!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(dob))return false;
  const date=new Date(dob+'T00:00:00Z');
  if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==dob)return false;
  return date<=new Date(Date.UTC(now.getUTCFullYear()-21,now.getUTCMonth(),now.getUTCDate()));
}
const randomToken=()=>{
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
};
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createMembershipHandler(db,qrImage) {
  return async function handle(request) {
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
    const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    try {
      const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
      if(!token||token.length>8192)fail(401,'Sign in to continue.');
      const {data:authData,error:authError}=await db.auth.getUser(token);
      const user=authData?.user;
      if(authError||!user?.id||!user.email||!user.email_confirmed_at)fail(401,'Sign in with a confirmed email to continue.');
      let body={};
      if(request.method==='POST'){
        const raw=await request.text();if(raw.length>8192)fail(413,'Request too large.');
        try{body=JSON.parse(raw||'{}');}catch{fail(400,'Invalid request.');}
        if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Invalid request.');
      }
      const path=new URL(request.url).pathname.split('/api/v1/')[1];
      async function member() {
        const {data,error}=await db.from('members').select('id,member_number,full_name,status,points,tier,membership_plan,created_at,date_of_birth').eq('auth_user_id',user.id).maybeSingle();
        if(error)throw error;return data;
      }
      function publicMember(m){const {date_of_birth,...safe}=m;return safe;}
      if(path==='members/enroll'&&request.method==='POST'){
        const {name,dob,phone='',consent}=body;
        if(typeof name!=='string'||name.trim().length<2||name.trim().length>120||typeof phone!=='string'||phone.length>40||consent!==true)
          fail(400,'Enter your name and accept the voluntary membership terms.');
        if(!isAtLeast21(dob))fail(400,'Enter a valid date of birth. BARIO is 21+.');
        const cardToken=randomToken();
        const {error}=await db.rpc('enroll_bario_member',{actor_id:user.id,payload:{full_name:name.trim(),date_of_birth:dob,phone,verified_email:user.email,
          member_number:'BARIO-'+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),
          card_number:'BC-'+crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase(),qr_token_hash:await hash(cardToken)}});
        if(error)throw error;
        return reply({member:publicMember(await member()),priceCents:0,automaticBilling:false},201);
      }
      if(path==='members/me'&&request.method==='GET'){
        const m=await member();if(!m)fail(404,'Complete your free membership profile.');
        const {data:activity,error}=await db.from('member_events').select('id,kind,description,points_delta,created_at,partner_bars(name)').eq('member_id',m.id).order('created_at',{ascending:false}).limit(50);
        if(error)throw error;
        return reply({member:publicMember(m),activity,priceCents:0,automaticBilling:false});
      }
      if(path==='members/me/card'&&request.method==='POST'){
        const code=randomToken();const {data,error}=await db.rpc('issue_bario_qr',{actor_id:user.id,new_hash:await hash(code)});
        if(error)fail(403,'Your digital card is unavailable. Check membership status or contact support.');
        const qrText='bario:check:'+code;
        return reply({...data,qrText,qrImage:await qrImage(qrText)});
      }
      if(path==='staff/bars'&&request.method==='GET'){
        const {data,error}=await db.from('bar_staff').select('bar_id,partner_bars(id,name,status)').eq('auth_user_id',user.id).eq('active',true);
        if(error)throw error;
        return reply({bars:(data||[]).filter(row=>row.partner_bars?.status==='approved').map(row=>row.partner_bars)});
      }
      if(path==='staff/scan'&&request.method==='POST'){
        const {barId,qrText,idChecked=false}=body;
        if(typeof idChecked!=='boolean'||typeof barId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barId)||typeof qrText!=='string'||!/^bario:check:[A-Za-z0-9_-]{43}$/.test(qrText))
          fail(400,'Choose a bar and scan a current BARIO membership QR.');
        const {data,error}=await db.rpc('scan_bario_card',{actor_id:user.id,target_bar:barId,scanned_hash:await hash(qrText.slice(12)),id_checked:idChecked});
        if(error)fail(403,'Card could not be accepted. Confirm staff access and member age approval, then ask the member to refresh an expired or used QR.');
        return reply(data);
      }
      if(path?.startsWith('partners/rideshare/')&&request.method==='POST'){
        const m=await member();
        if(!m||(body.memberId&&body.memberId!==m.member_number))fail(403,'Membership not eligible.');
        if(!['approved','issued','active'].includes(m.status)||!isAtLeast21(m.date_of_birth))fail(403,'Approved 21+ membership required.');
        const [{data:v,error:ve},{data:c,error:ce}]=await Promise.all([
          db.from('age_verifications').select('result').eq('member_id',m.id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle(),
          db.from('cards').select('id,status,expires_at').eq('member_id',m.id).eq('card_type','digital').order('issued_at',{ascending:false}).limit(1).maybeSingle()
        ]);
        if(ve||ce)throw ve||ce;
        if(v?.result!=='passed'||!c||!['issued','active'].includes(c.status)||(c.expires_at&&new Date(c.expires_at)<=new Date()))fail(403,'Current card and passed age verification required.');
        if(path==='partners/rideshare/compare'){
          try{return reply(createRidePlan(body));}catch(e){fail(400,e.message);}
        }
        if(['partners/rideshare/lyft/discount','partners/rideshare/uber/voucher'].includes(path))
          fail(503,'Rideshare offers are not available yet. No voucher has been issued.');
      }
      fail(404,'Not found.');
    }catch(error){
      if(error.status)return reply({error:error.message},error.status);
      console.error('Membership request failed',{code:error.code||'internal'});
      return reply({error:'Membership service is temporarily unavailable. Please try again.'},500);
    }
  };
}
