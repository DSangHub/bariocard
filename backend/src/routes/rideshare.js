import express from 'express';
import {membershipWeb} from '../lib/membership-web.js';
const router=express.Router();
router.use(membershipWeb);
export default router;
