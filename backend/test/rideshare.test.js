import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY='test-only';
const {default:express}=await import('express');
const {supabase}=await import('../src/lib/supabase.js');
const {default:router}=await import('../src/routes/rideshare.js');
const app=express(); app.use(express.json()); app.use(router);
const server=app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
let member,card,verification;
supabase.from=(table)=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:{members:member,cards:card,age_verifications:verification}[table]})};return q;};
test('rideshare authorization and fail-closed offers',async()=>{
 try {
  for(const path of ['/lyft/discount','/uber/voucher']) {
   const request=(token)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+'a'.repeat(43)}:{})},body:JSON.stringify({memberId:'BARIO-TEST'})});
   assert.equal((await request(false)).status,401);
   member=null; assert.equal((await request(true)).status,403);
   member={id:'id',status:'age_pending',date_of_birth:'1990-01-01'};
   card={status:'issued'}; assert.equal((await request(true)).status,403);
   member.status='active'; verification={result:'pending'}; assert.equal((await request(true)).status,403);
   verification={result:'passed'}; card.status='suspended'; assert.equal((await request(true)).status,403);
   card.status='active'; member.date_of_birth='2020-01-01'; assert.equal((await request(true)).status,403);
   member.date_of_birth='1990-01-01'; assert.equal((await request(true)).status,503);
  }
 } finally { server.close(); }
});
