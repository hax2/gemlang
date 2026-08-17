# GemLang

GemLang is a focused Spanish listening and translation course with 64 lessons, stories, and reviews. It is a React 19/Vite app deployed to GitHub Pages, with Supabase authentication and Lemon Squeezy subscription billing.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Useful checks:

```bash
npm run build
npm run lint
npm run validate:data
```

## Monetisation

- **Free:** Chapters 1–3 plus the first review (195 practice sentences).
- **Pro monthly:** €8.99/month.
- **Pro yearly:** €59.99/year (44% less than monthly).
- **Pro includes:** all 64 current modules and future additions.
- **Billing:** Lemon Squeezy is merchant of record and handles checkout, VAT/sales tax, invoices, payment recovery, refunds, and the customer billing portal.
- **Entitlements:** signed Lemon Squeezy webhooks update a Supabase table protected by row-level security.

See [MONETIZATION_SETUP.md](MONETIZATION_SETUP.md) for the one-time account and launch steps.

## Architecture

```text
React app -> authenticated Supabase Edge Function -> Lemon Squeezy checkout
    ^                                                |
    |                                                v
RLS subscription row <- signature-verified webhook <- subscription events
```

The first four modules remain available to signed-in users and guests. Premium module selection is gated by the server-synchronised subscription entitlement. Course JSON is shipped as static Vite chunks, so this is access control rather than DRM; a determined technical user could inspect deployed assets.
