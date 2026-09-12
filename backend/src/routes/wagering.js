
import express from 'express';
const router = express.Router();

function isWageringLegal(state){
  // CA, TX, UT, etc not legal for real-money online sports
  const illegal = ['CA','TX','UT','ID'];
  return !illegal.includes((state||'CA').toUpperCase());
}

router.post('/draftkings/promo', async (req,res)=>{
  const {memberId, state='CA'} = req.body;
  if(!isWageringLegal(state)){
    return res.json({
      provider:'draftkings',
      type:'free_to_play',
      promo:'DK-TBIO-FREE10',
      disclaimer:'CA: Real-money sports wagering not legal. Free-to-play contest only. 21+ Gamble Responsibly 1-800-GAMBLER',
      affiliate_tracking: process.env.DRAFTKINGS_AFFILIATE_KEY
    });
  }
  // Real call when legal: await fetch('https://api.draftkings.com/partner/v1/promos', {...})
  res.json({provider:'draftkings', type:'real_money', promo:`DK-TBIO-${memberId.slice(-4)}`, amount:'$10 off first contest'});
});

router.post('/fanduel/promo', async (req,res)=>{
  const {memberId, state='CA'} = req.body;
  if(!isWageringLegal(state)){
    return res.json({provider:'fanduel', type:'free_to_play', promo:'FD-TBIO-FREE10', disclaimer:'CA: Free-to-play only'});
  }
  res.json({provider:'fanduel', type:'real_money', promo:`FD-TBIO-${memberId.slice(-4)}`});
});

export default router;
