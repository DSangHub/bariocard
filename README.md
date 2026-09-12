
# The Bar Is Open - BARIO
Voluntary 21+ Membership with Ride-Share Safety + Wagering Partners + Merch

## California ABC Compliant
- Voluntary membership, NOT required to purchase alcohol (Type 48 compliant)
- No free alcoholic beverages as rewards per BPC 25600 / Rule 106
- Retailer-funded discounts only, no supplier funding (no tied-house)
- 21+ verified, CCPA Notice of Financial Incentive included
- Ride-share encouraged, wagering geo-fenced (CA = free-to-play only)

## Structure
/frontend - React + Vite + Tailwind (deploy to Vercel/Netlify)
/backend - Express API with Stripe, Lyft, Uber, DraftKings connectors

## Quick Start
1. `cd backend && cp .env.example .env` fill keys
2. `npm install && npm run dev` -> http://localhost:3001
3. `cd ../frontend && npm install && npm run dev` -> http://localhost:5173

## Env Vars Required
STRIPE_SECRET_KEY=sk_test_...
LYFT_CLIENT_ID=...
LYFT_CLIENT_SECRET=...
UBER_CLIENT_ID=...
UBER_CLIENT_SECRET=...
DRAFTKINGS_AFFILIATE_KEY=...
FANDUEL_AFFILIATE_KEY=...
JWT_SECRET=...

## API Endpoints
GET /api/v1/members/:id
POST /api/v1/members/verify (21+)
POST /api/v1/partners/rideshare/lyft/discount
POST /api/v1/partners/rideshare/uber/voucher
POST /api/v1/partners/wagering/draftkings/promo (geo-fenced)
POST /api/v1/partners/wagering/fanduel/promo
POST /api/v1/merch/checkout (Stripe)
POST /api/v1/merch/discount

## Deploy
Frontend: Vercel -> import /frontend
Backend: Render / Railway / Fly.io
Set env vars in dashboard.
