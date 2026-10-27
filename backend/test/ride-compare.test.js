import test from 'node:test';
import assert from 'node:assert/strict';
import {createRidePlan} from '../src/lib/ride-compare.js';
const now=Date.now();
const valid={pickup:'123 Bar St, Fresno CA',destination:'456 Home St, Fresno CA',departureAt:new Date(now+25*60000).toISOString()};
test('25-minute plan has no fabricated quotes, discounts or bookings',()=>{
 const result=createRidePlan(valid,now);
 assert.equal(Date.parse(result.departureAt)-now,25*60000);
 assert.equal(result.booked,false);
 assert.equal(result.discount.status,'not_active');
 assert.equal(result.discount.maximumCents,500);
 assert.deepEqual(result.providers.map(p=>p.fare),[null,null]);
 assert.ok(result.providers.every(p=>p.status==='approval_required'));
});
test('rejects malformed addresses and invalid departure times',()=>{
 for(const input of [{...valid,pickup:123},{...valid,destination:''},{...valid,departureAt:'bad'},{...valid,departureAt:new Date(now-1).toISOString()},{...valid,departureAt:new Date(now+25*3600000).toISOString()}])
 assert.throws(()=>createRidePlan(input,now));
});
