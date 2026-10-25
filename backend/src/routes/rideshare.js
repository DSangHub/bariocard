import express from 'express';
import { createHash } from 'node:crypto';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

router.use(async (req, res, next) => {
  try {
    const token = req.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    const memberId = req.body?.memberId;
    if (!token) return res.status(401).json({error:'Membership credential required'});
    if (typeof memberId !== 'string') return res.status(400).json({error:'Member ID required'});
    const {data: member, error} = await supabase.from('members')
      .select('id,status,date_of_birth').eq('member_number', memberId).maybeSingle();
    if (error) throw error;
    if (!member) return res.status(403).json({error:'Membership not eligible'});
    const {data: card, error: cardError} = await supabase.from('cards')
      .select('id,status,expires_at').eq('member_id', member.id)
      .eq('qr_token_hash', createHash('sha256').update(token).digest('hex')).maybeSingle();
    if (cardError) throw cardError;
    if (!card || !['issued','active'].includes(card.status) ||
        (card.expires_at && new Date(card.expires_at) <= new Date()))
      return res.status(403).json({error:'Invalid or expired membership credential'});
    const cutoff = new Date(); cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 21);
    if (!['approved','issued','active'].includes(member.status) ||
        !member.date_of_birth || new Date(member.date_of_birth) > cutoff)
      return res.status(403).json({error:'Approved 21+ membership required'});
    const {data: verification, error: verificationError} = await supabase.from('age_verifications')
      .select('result').eq('member_id', member.id)
      .order('created_at', {ascending:false}).limit(1).maybeSingle();
    if (verificationError) throw verificationError;
    if (verification?.result !== 'passed')
      return res.status(403).json({error:'Age verification required'});
    next();
  } catch (error) { next(error); }
});

// Fail closed until a provider-backed offer integration is configured.
router.post(['/lyft/discount', '/uber/voucher'], (req, res) => {
  res.status(503).json({error:'Rideshare offers are not available yet. No voucher has been issued.'});
});
export default router;
