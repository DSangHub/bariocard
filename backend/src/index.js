
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import membersRouter from './routes/members.js';
import rideshareRouter from './routes/rideshare.js';
import wageringRouter from './routes/wagering.js';
import merchRouter from './routes/merch.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.get('/health', (req,res)=> res.json({ok:true, abc_compliant:true}));
app.use('/api/v1/members', membersRouter);
app.use('/api/v1/partners/rideshare', rideshareRouter);
app.use('/api/v1/partners/wagering', wageringRouter);
app.use('/api/v1/merch', merchRouter);

app.listen(process.env.PORT || 3001, ()=> console.log('BARIO API running'));
