# ONO Poké Bar — Premium Ordering Experience

Production-style Next.js 14 ordering site for **ONO Poké Bar** (Toronto) with MongoDB, Stripe Checkout, NextAuth (credentials), and a protected admin console.

## Prerequisites

- Node.js 18+ (Node 20 recommended for local env file loading)
- MongoDB instance (local or Atlas)
- Stripe account (test mode is fine until launch)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in real values. **Never commit `.env.local`** — it is gitignored.

| Variable | Purpose |
| -------- | ------- |
| `MONGODB_URI` | Mongo connection string |
| `NEXTAUTH_SECRET` | Strong random string (e.g. `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Same origin users use (often matches `NEXT_PUBLIC_SITE_URL`) |
| `NEXT_PUBLIC_SITE_URL` | Used for Stripe success/cancel URLs (`/payment-success`, `/payment-cancelled`) |
| `STRIPE_SECRET_KEY` | Must start with `sk_test_` or `sk_live_` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Must start with `pk_test_` or `pk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from Stripe Dashboard or Stripe CLI (`whsec_…`) |
| `RESTAURANT_ORDER_EMAIL` | Kitchen inbox for new paid orders (or set **Admin → Settings → email** in MongoDB) |
| `ORDER_CC_EMAIL` | CC on transactional order emails (defaults to `junkong68@gmail.com` in code if unset) |
| `MAILGUN_API_KEY` | Mailgun private API key (recommended for production transactional email) |
| `MAILGUN_DOMAIN` | Sending domain verified in Mailgun (e.g. `merchantorders.io`) |
| `MAILGUN_FROM_EMAIL` | Verified sender address (e.g. `orders@merchantorders.io`) |
| `MAILGUN_FROM_NAME` | Display name on outbound mail (e.g. `Merchant Orders`) |
| `ADMIN_ORDER_EMAIL` | Optional BCC for new-order Mailgun email when different from `RESTAURANT_ORDER_EMAIL` |
| `ORDER_FROM_EMAIL` | Legacy: from address when **not** using Mailgun |
| `EMAIL_PROVIDER` | Legacy: `resend` **or** `smtp` when `MAILGUN_API_KEY` is unset |
| `RESEND_API_KEY` | Legacy: required when `EMAIL_PROVIDER=resend` |
| `SMTP_*` | Legacy: required when `EMAIL_PROVIDER=smtp` |

Optional:

| Variable | Purpose |
| -------- | ------- |
| `STRIPE_CONNECTED_ACCOUNT_ID` | Phase 2 Connect — must start with `acct_`; enables ~11% platform fee + destination transfer |
| `RESTAURANT_ID` | Stored in Checkout metadata (`servingMode` is always `in_store_pickup` on new orders) |

**Stripe key sanity:** keys beginning with `mk_` are **not** Stripe publishable/secret keys. Use Dashboard → Developers → API keys (`pk_…`, `sk_…`). The app throws clear startup/API errors if prefixes are wrong.

After any change to env files, **restart** `npm run dev` so Next.js reloads them.

### Mailgun (transactional email)

1. Create a Mailgun account and add + verify the sending domain (e.g. `merchantorders.io`).
2. Create a sending API key and set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`, and `MAILGUN_FROM_NAME` in `.env.local`.
3. Ensure DNS records (SPF, DKIM, etc.) from Mailgun are published so inbox placement is good.
4. When `MAILGUN_API_KEY` is set, paid-order **customer confirmation**, **kitchen new-order**, and **customer status updates** (preparing / ready / completed / cancelled) use Mailgun HTML templates in `lib/emailTemplates/`. If Mailgun is **not** configured, the app falls back to Resend/SMTP when `EMAIL_PROVIDER` is set (see `.env.example`).

**Branding:** Merchant Orders appears only in transactional emails and the Mailgun “from” name — not on the public restaurant website.

### 3. MongoDB must be running

- **Option A — Docker:** `docker compose up -d`, wait a few seconds, then `npm run seed`.
- **Option B — Windows service:** start MongoDB, then `npm run seed`.

### 4. Brand logo

Place the circular ONO logo at `public/images/logo.png`.

### 5. Seed the database

```bash
npm run seed
```

**Development admin**

- Email: `admin@onopokebar.com`
- Password: `Admin123!ChangeMe` (**rotate before any real deployment**)

### 6. Stripe webhook

**Local (Stripe CLI):**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the CLI signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.

**Production:** Stripe Dashboard → Developers → Webhooks → Add endpoint → URL `https://YOUR_DOMAIN/api/stripe/webhook` → select `checkout.session.completed` (and optionally `charge.refunded`) → reveal signing secret → set `STRIPE_WEBHOOK_SECRET` on your host (e.g. Vercel).

The route stays deployed even if the secret is missing; it returns **503** with setup instructions until `whsec_…` is configured.

### 7. Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Payments & email flow

1. Customer submits **pickup-only** checkout → `POST /api/stripe/create-checkout-session` validates the cart **server-side**, creates an **unpaid** MongoDB order (`servingMode: in_store_pickup`, no delivery), then creates a Stripe Checkout Session (`mode: payment`, currency `cad`, line items from validated menu prices + adjustment line so the session total matches the computed total).
2. Success redirect → `/payment-success?session_id=…` shows a confirmation UI. `GET /api/stripe/session-status` returns a read-only summary for display only (it does **not** mark orders paid — webhook only).
3. Stripe sends `checkout.session.completed` to `POST /api/stripe/webhook`. After signature verification, the handler marks the order paid (once), increments promo usage (once), sends kitchen + customer confirmation via **Mailgun** when configured (`ORDER_CC_EMAIL` CC’d), sets `confirmationEmailSent` / `merchantNotificationEmailSent` idempotency flags, and records the Stripe event id to tolerate retries.
4. Admin status changes (`PATCH /api/admin/orders/:id/status`) send Mailgun **status update** emails for preparing / ready / completed / cancelled, deduped with `statusEmailLog`.

**Phase 2 — Stripe Connect:** when `STRIPE_CONNECTED_ACCOUNT_ID` is set and starts with `acct_`, Checkout uses `payment_intent_data.application_fee_amount` (~11%) and `transfer_data.destination` so the platform keeps the fee and the remainder is transferred to the connected account. Without `acct_`, the platform account receives the full amount.

## API routes (Stripe)

| Method | Path | Role |
| ------ | ---- | ---- |
| POST | `/api/stripe/create-checkout-session` | Create order + Checkout Session |
| GET | `/api/stripe/session-status` | Sanitized session + order subset for the success page |
| POST | `/api/stripe/webhook` | Stripe webhook (raw body + signature) |

Legacy `POST /api/checkout/create-session` delegates to the same implementation.

## Testing checklist (local)

- Wrong `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` prefixes surface clear **503** messages from API routes that touch Stripe.
- Checkout rejects invalid carts server-side; delivery is not offered (pickup-only).
- Stripe Checkout opens; completing payment lands on `/payment-success`.
- Cancel returns via `/payment-cancelled`.
- With Mailgun (or legacy Resend/SMTP), completing payment delivers kitchen + customer emails; webhook retries do not duplicate sends once `confirmationEmailSent` / `merchantNotificationEmailSent` are true.
- Admin **Orders** → **Enable order alerts** unlocks audio; new orders at the top of the list trigger `/sounds/order-notification.mp3` (after a user gesture).
- `npm run build` succeeds.

## Deploying on Vercel

1. Connect the repo and set **all** environment variables from `.env.example` in Project → Settings → Environment Variables.
2. Use production Stripe keys only on **Production**; keep **Preview** on test keys if desired.
3. Configure the production webhook URL in Stripe to `https://YOUR_PROJECT.vercel.app/api/stripe/webhook`.
4. Ensure `NEXT_PUBLIC_SITE_URL` matches the deployed origin (no trailing slash).

## Architecture highlights

- **App Router** under `app/` with public `(site)` and protected `admin` (NextAuth middleware).
- **Checkout totals & tax** live in `lib/checkout/create-stripe-checkout-session.ts` (keep admin/menu pricing in sync).
- **Cart**: Zustand (`ono-cart` key).

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run seed` | Seed MongoDB |
| `npm run lint` | ESLint |

## Legal / content

Do not scrape or hotlink third-party delivery marketplaces. Replace stock imagery with licensed assets before launch.
