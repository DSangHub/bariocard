import test from 'node:test';
import assert from 'node:assert/strict';
import {createMembershipHandler,isAtLeast21} from '../../supabase/functions/_shared/membership-handler.js';
const confirmed={id:'verified-user',email:'verified@example.invalid',email_confirmed_at:'2026-01-01'};
function fixture(user=confirmed){
 const calls=[];
 const member={id:'member',member_number:'BARIO-ONE',full_name:'Customer',status:'age_pending',points:100,membership_plan:'free_launch',date_of_birth:'1990-01-01'};
 const db={auth:{getUser:async token=>({data:{user:token==='session'?user:null},error:null})},
 rpc:async(name,args)=>{calls.push({name,args});return {data:name==='issue_bario_qr'?{cardNumber:'BC-ONE',expiresAt:new Date(Date.now()+90000).toISOString()}:{valid:true,visitRecorded:true},error:null};},
 from:table=>{
   const query={select:()=>query,eq:(column,value)=>{calls.push({table,column,value});return query;},order:()=>query,limit:()=>query,
   maybeSingle:async()=>({data:table==='members'?member:null,error:null}),
   then:resolve=>Promise.resolve({data:table==='member_events'?[]:[],error:null}).then(resolve)};
   return query;
 }};
 return {handle:createMembershipHandler(db,async()=> 'data:image/png;base64,qr'),calls,member};
}
const request=(handle,path,body,token='session')=>handle(new Request('https://example.test/api/v1/'+path,{
 method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token},...(body===undefined?{}:{body:JSON.stringify(body)})}));
test('membership requires a confirmed Auth session, never a static card token',async()=>{
 const {handle}=fixture();assert.equal((await request(handle,'members/me',undefined,'old-card-credential')).status,401);
 const unconfirmed=fixture({id:'unconfirmed'});assert.equal((await request(unconfirmed.handle,'members/me')).status,401);
});
test('profile lookup is scoped to session user and hides date of birth',async()=>{
 const {handle,calls}=fixture();const response=await request(handle,'members/me');assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.priceCents,0);assert.equal(data.automaticBilling,false);assert.equal(data.member.date_of_birth,undefined);
 assert.ok(calls.some(call=>call.column==='auth_user_id'&&call.value==='verified-user'));
 assert.equal((await request(handle,'members/BARIO-SOMEONE-ELSE')).status,404);
});
test('enrollment ignores forged actor, price and status and requires consent and valid birth date',async()=>{
 const {handle,calls}=fixture();
 for(const changes of [{consent:false},{dob:'2020-01-01'},{dob:'2000-02-31'},{name:{bad:true}}]){
 assert.equal((await request(handle,'members/enroll',{name:'Customer',dob:'1990-01-01',consent:true,...changes})).status,400);
 }
 const response=await request(handle,'members/enroll',{name:'Customer',dob:'1990-01-01',consent:true,actor_id:'attacker',membership_plan:'paid',status:'active'});
 assert.equal(response.status,201);const rpc=calls.find(call=>call.name==='enroll_bario_member');
 assert.equal(rpc.args.actor_id,'verified-user');assert.equal(rpc.args.payload.status,undefined);assert.equal(rpc.args.payload.membership_plan,undefined);
});
test('card QR contains only random temporary credential and stores only its hash',async()=>{
 const {handle,calls}=fixture();const response=await request(handle,'members/me/card',{});const data=await response.json();
 assert.equal(response.status,200);assert.match(data.qrText,/^bario:check:[A-Za-z0-9_-]{43}$/);
 const rpc=calls.find(call=>call.name==='issue_bario_qr');assert.equal(rpc.args.actor_id,'verified-user');assert.match(rpc.args.new_hash,/^[a-f0-9]{64}$/);
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('staff scan uses session actor, hashes QR and rejects malformed input',async()=>{
 const {handle,calls}=fixture();assert.equal((await request(handle,'staff/scan',{barId:'x',qrText:'x'})).status,400);
 const response=await request(handle,'staff/scan',{actor_id:'attacker',barId:'12345678-1234-1234-1234-123456789012',qrText:'bario:check:'+'a'.repeat(43),idChecked:true});
 assert.equal(response.status,200);const rpc=calls.find(call=>call.name==='scan_bario_card');assert.equal(rpc.args.actor_id,'verified-user');assert.equal(rpc.args.id_checked,true);assert.match(rpc.args.scanned_hash,/^[a-f0-9]{64}$/);
});
test('strict calendar date validation and 21st birthday',()=>{
 assert.equal(isAtLeast21('2005-11-02',new Date('2026-11-02T12:00:00Z')),true);
 assert.equal(isAtLeast21('2005-11-03',new Date('2026-11-02T12:00:00Z')),false);
 assert.equal(isAtLeast21('2000-02-31'),false);
});
