
import express from 'express';
const router = express.Router();

router.post('/lyft/discount', async (req,res)=>{
  const {memberId} = req.body;
  // TODO: Exchange LYFT_OAUTH_TOKEN and call Lyft API
  // const lyftRes = await fetch('https://api.lyft.com/v1/offers', {...})
  const code = `LYFT-TBIO-${memberId.slice(-4)}-${Math.floor(Math.random()*9000)}`;
  console.log('Would call Lyft API with token', process.env.LYFT_OAUTH_TOKEN);
  res.json({provider:'lyft', code, amount:'$5 off after 9pm', deepLink:`https://ride.lyft.com/promo/${code}`});
});

router.post('/uber/voucher', async (req,res)=>{
  const {memberId} = req.body;
  // Uber for Business Vouchers API: POST https://api.uber.com/v2/vouchers
  const code = `UBER-TBIO-${memberId.slice(-4)}`;
  res.json({provider:'uber', code, amount:'$5', deepLink:`https://m.uber.com/looking?promo=${code}`});
});

export default router;
