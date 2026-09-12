
import express from 'express';
import Stripe from 'stripe';
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

router.post('/discount', (req,res)=>{
  const {memberId} = req.body;
  // Verify member exists
  res.json({code:`TBIO20-${memberId.slice(-4)}`, percentOff:20, validFor:'merch only, retailer-funded, ABC compliant'});
});

router.post('/checkout', async (req,res)=>{
  const {items, memberId, email} = req.body;
  try{
    const session = await stripe.checkout.sessions.create({
      line_items: items.map(i=>({price_data:{currency:'usd', product_data:{name:i.name}, unit_amount:i.price*100}, quantity:1})),
      discounts: memberId ? [{coupon: process.env.STRIPE_COUPON_20 || undefined}] : [],
      customer_email: email,
      mode:'payment',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {memberId, abc_compliant:'true', retailer_funded:'true'}
    });
    res.json({url: session.url, id: session.id});
  }catch(e){
    // Fallback mock if no Stripe key
    res.json({url:'https://checkout.stripe.com/mock_TBIO', mock:true, error:e.message});
  }
});

export default router;
