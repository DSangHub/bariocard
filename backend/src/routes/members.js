
import express from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

function isAtLeast21(dob) {
  const birthDate = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return false;
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 21, now.getUTCMonth(), now.getUTCDate()));
  return birthDate <= cutoff;
}

function memberNumber() {
  return `BARIO-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function cardCredentials() {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    cardNumber: `BC-${randomBytes(6).toString('hex').toUpperCase()}`,
  };
}

router.post('/verify', async (req,res,next)=>{
  try {
    const { dob, name, email, phone = null, preferredDelivery = 'pickup', mailingAddress = null } = req.body;
    if (!name?.trim() || !email?.trim() || !dob) return res.status(400).json({error:'Name, email, and date of birth are required'});
    if (!['pickup', 'mail'].includes(preferredDelivery)) return res.status(400).json({error:'Delivery must be pickup or mail'});
    if (preferredDelivery === 'mail' && !mailingAddress?.street) return res.status(400).json({error:'A mailing address is required for mail delivery'});
    if (!isAtLeast21(dob)) return res.status(403).json({error:'21+ only'});

    const card = cardCredentials();
    const { data: member, error } = await supabase.rpc('register_bario_member', {
      payload: {member_number: memberNumber(), full_name: name.trim(), email: email.trim().toLowerCase(),
        phone, date_of_birth: dob, preferred_delivery: preferredDelivery,
        mailing_address: preferredDelivery === 'mail' ? mailingAddress : null,
        card_number: card.cardNumber, qr_token_hash: card.tokenHash}
    });
    if (error) {
      if (error.code === '23505') return res.status(409).json({error:'A member with this email already exists'});
      throw error;
    }

    res.status(201).json({
      memberId: member.member_number,
      status: member.status,
      verified: false,
      digitalCard: card.cardNumber,
      points: member.points,
      qrToken: card.token,
      delivery: preferredDelivery,
      nextStep: preferredDelivery === 'pickup' ? 'Present government ID at a participating bar.' : 'Complete BARIO remote age verification.',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req,res,next)=>{
  try {
    const { data, error } = await supabase.from('members')
      .select('member_number,status,points,tier,preferred_delivery,created_at')
      .eq('member_number', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({error:'Member not found'});
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
