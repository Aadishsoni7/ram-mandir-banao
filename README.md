# Ram Mandir Banao

An interactive digital Shri Ram temple with a shared courtyard, named building pieces, timed diyas and a garden of remembrance

**Live website:** https://rammandirbanao.tech/

## Experience

- Explore the 3D temple, sanctum and living courtyard on desktop and mobile
- Switch between English and Hindi
- Choose any combination of stones, pillars, roof slabs, shikhara pieces and the golden temple crown
- Make digital dedications with live Razorpay checkout
- See verified paid contributions saved across visits and devices
- Light one of five shared diyas for a selected duration
- Return to a dedication using its place link
- Microsoft Clarity project tag included

This is an independent digital devotional experience — digital items do not claim physical construction, tree planting or rituals

## Stack

Vanilla JavaScript modules, Three.js, Vercel serverless functions, PostgreSQL hosted on Supabase and Razorpay hosted checkout

## Run and deploy

Requires Node.js 22 or later

```sh
npm install
npm run build
npx vercel dev
```

Create a Supabase PostgreSQL project and apply `database/supabase-schema.sql` using its SQL editor
Copy `.env.example` to `.env.local` for local development and configure the corresponding production variables in Vercel
Use your own database connection and Razorpay merchant credentials

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | PostgreSQL connection string for your Supabase project |
| DATABASE_PASSWORD | Optional existing deployment password override |
| RAZORPAY_KEY_ID | Live merchant public key ID |
| RAZORPAY_KEY_SECRET | Private merchant API secret |
| RAZORPAY_WEBHOOK_SECRET | Secret shared with the Razorpay webhook |

Production webhook: `https://YOUR_DOMAIN/api/temple/payment-webhook`
Subscribe to `payment.captured` and `order.paid`
Do not commit environment files or put private secrets in browser bundles

The Vercel build copies `public/experience.html` to `public/index.html` — edit the experience template when changing the homepage

## Payment verification

Payment amounts are calculated on the server
Dedications are confirmed only after server verification of a captured INR payment for the matching provider order and amount
Confirmation and webhook handling are idempotent
Diya duration starts when fulfilment succeeds
A tracked captured payment can be reconciled without charging the customer again

```sh
node scripts/check-razorpay.mjs
npm install --no-save @electric-sql/pglite@0.5.13
node scripts/check-live-payments.mjs
```

The isolated checks do not make real payment transactions

## Source layout

- `public/` — frontend modules, styles, models, artwork and vendor assets
- `api/` — Vercel API handler
- `server/` — database adapter, live dedication service and payment verification
- `database/` — Supabase schema
- `scripts/` — build and isolated payment checks

## Artwork and rights

Artwork and third-party asset credits are listed in `public/source-credits.html`
Third-party materials retain their respective ownership and licences
No open-source licence is granted for original project materials by this repository

Private environment values, account setup screenshots and customer database records are not included
