
# BARIO
BARIO is a voluntary 21+ membership program with ride-share safety, wagering partners, and merchandise benefits.

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
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_... # backend only; never expose in VITE_* variables
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

## Ride Compare
The member-facing planner accepts a pickup address, destination, and departure in 25, 30, 45, or 60 minutes. `POST /api/v1/partners/rideshare/compare` requires the member ID and issued card credential in the Bearer authorization header, plus approved 21+ membership and a passed age check.

The current response returns provider availability and outbound links. Live fares, ETAs, bidding, booking, notifications, and redemption are not activated. No credentials or approved quote integrations are present in this repository; provider approval is required before adding live adapters. The client keeps its countdown in page memory only and sends no addresses in outbound links. The proposed benefit is 50 cents per eligible road mile up to 10 miles ($5), and is explicitly inactive. User-entered distance is never used to award discounts.

Validation: `node --test backend/test/*.test.js`; `npm run build --prefix frontend`.
