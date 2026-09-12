
import express from 'express';
const router = express.Router();

// In prod replace with DB
const members = new Map();

router.post('/verify', (req,res)=>{
  const {dob, name, email} = req.body;
  const age = (Date.now() - new Date(dob).getTime()) / (365.25*24*60*60*1000);
  if(age < 21) return res.status(403).json({error:'21+ only'});
  const id = 'TBIO-' + Math.random().toString(36).substring(2,6).toUpperCase();
  members.set(id, {id, name, email, dob, points: 100, tier: 'BRONZE'});
  res.json({memberId:id, verified:true});
});

router.get('/:id', (req,res)=>{
  const m = members.get(req.params.id) || {id:req.params.id, points: 250, tier:'SILVER'};
  res.json(m);
});

export default router;
