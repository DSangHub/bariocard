# BARIO — Free Digital Membership

Customers join free at launch. No card, subscription, automatic upgrade, or payment collection is part of customer enrollment. Bars have a separate proposed 30-day-free / $75 monthly plan; bar billing is not enabled here.

Bar owners can sign in and submit a business profile with owner/manager name, address, phone, ABC license number, and licensing jurisdiction. New and license-changed applications remain pending until BARIO verifies the license with the applicable ABC authority. Submission does not represent automatic government verification or approval, and bar benefits remain disabled while pending.

## Customer flow

Create an email/password account, confirm email, sign in, then complete name/date of birth and optional phone. Enrollment creates a free membership, digital card, pending age check, and welcome activity in one transaction. Existing memberships can be linked only to a confirmed account with the matching email. Membership status and points come from the server. The signup form includes password visibility, confirmation resend, password reset and recovery, and sign-out.

A digital card creates a 90-second, single-use QR. Refresh invalidates the previous QR. Codes contain no name, email, date of birth, or payment details. Membership is not proof of age. Staff at approved bars can scan with camera where supported or paste the temporary code. Staff must explicitly confirm an in-person government ID check before changing pending age approval. The backend checks staff assignment, bar approval, membership/card status and age. One visit per bar per UTC day is recorded, with no automatic reward points or ride discount. Activity history is visible only to its owner.

Phone wallet passes, reward redemption, self-service bar onboarding, billing and license uploads remain future work.

## Hosting

The production membership API is the `bario-membership` Supabase Edge Function in the existing BARIO project. The frontend defaults to this endpoint; its project URL and publishable key are public configuration. No server secrets are placed in Vite variables.

### Vercel Services deployment

The root `vercel.json` deploys `frontend` and `backend` together as one Vercel Services project. Public `/api/*` traffic is routed to the Express backend and all other paths are routed to the Vite frontend. The frontend uses the relative `/api` path in production, so preview and production deployments call their matching backend service without hard-coded deployment URLs.

Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `FRONTEND_URL` as server environment variables during import. `SUPABASE_SECRET_KEY` must never use a `VITE_` prefix. `FRONTEND_URL` should be the production site origin after the domain is attached; same-origin preview requests do not require a separate preview URL. Vercel Services is currently Beta.

Frontend: set project root to `frontend`, run `npm ci` and `npm run build`, publish `dist`. Keep Supabase Auth Site URL and allowed redirect URLs set to the actual HTTPS frontend origin (including https://bariocard.com/ and https://www.bariocard.com/ if used). Confirmation and password recovery email delivery require working Supabase mail configuration. No production frontend hosting project was identified during this change.

Local frontend: `npm ci --prefix frontend` then `npm run dev --prefix frontend`. It uses the deployed Edge Function by default. Add localhost to Auth redirects for local confirmation/recovery tests.

Optional Express backend: `npm ci --prefix backend`, set `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `FRONTEND_URL` in `backend/.env`, then `npm start --prefix backend` from an environment that loads those variables. Set `VITE_API_URL=http://localhost:3001` for this mode. Express and Edge share membership business logic in `supabase/functions/_shared`. Do not expose the service-role/secret key to customers.

## API

All membership/staff/rideshare endpoints require a confirmed Supabase Auth session in the Bearer header. Static legacy card credentials no longer authenticate accounts. Private responses have Cache-Control: no-store.

- POST /api/v1/members/enroll
- GET /api/v1/members/me
- POST /api/v1/members/me/card
- GET /api/v1/owners/me
- POST /api/v1/owners/apply
- GET /api/v1/staff/bars
- POST /api/v1/staff/scan
- POST /api/v1/partners/rideshare/compare

Apply migrations in order. Function execution and private tables are service-only, with RLS enabled and no customer direct grants. The Edge Function validates Auth.getUser on every request; gateway JWT validation is disabled because authentication is implemented in the handler. Authorization uses database ownership and staff assignments, never editable user metadata.

## Ride Compare

Plan departure in 25/30/45/60 minutes, with pickup/destination and an in-page countdown. Live Uber/Lyft quotes, bids, booking, notifications, and discounts are not connected. Provider handoff links do not send addresses. The proposed 50 cents per eligible road mile up to 10 miles ($5) remains explicitly inactive. Customer membership itself is free.

## Validation

`node --test backend/test/*.test.js` and `npm run build --prefix frontend`. Database transaction checks cover enrollment idempotency, age/staff checks, QR expiry/replay, and duplicate visits. Live API verification covers password sign-in, free enrollment, profile/activity, decodable QR, pending-age rejection, and absence of staff access. Temporary test records are deleted after verification.
