# آل سليمان — Alsuliman Olive Oil

A production-ready, Arabic-first (RTL) e-commerce site for an Egyptian extra virgin
olive oil brand. English (`/en`) is available as a secondary locale.

Built with **Next.js 16 (App Router, `cacheComponents`)**, TypeScript, Tailwind CSS v4,
Zustand (client cart), Zod (validation) and **better-sqlite3** (orders, cash on delivery).

---

## Quick start

```bash
cp .env.example .env.local   # then edit — see "Configuration" below
npm install
npm run dev                  # http://localhost:3000  (redirects to /ar)
```

Production build:

```bash
npm run build
npm start
```

The SQLite database file is created automatically at `data/store.db`
(git-ignored). Set `DATABASE_FILE` to relocate it.

---

## What is included

| Area | Status |
| --- | --- |
| Home (hero, featured products, brand story, craft, culinary, reviews empty-state, newsletter) | ✅ |
| Shop with search, size filter, sort | ✅ |
| Product page (per-size variants, stock states, other-size links, storage & specs) | ✅ |
| Cart page + slide-in drawer (persisted across visits) | ✅ |
| Checkout (Zod-validated, cash on delivery, server-side re-pricing) | ✅ |
| Order confirmation with a unique reference (`SLM-YYMMDD-XXXX`) | ✅ |
| Order storage in SQLite, idempotency-key protected against double submit | ✅ |
| Admin (`/admin`) — login, stats, order list, status updates, product view | ✅ |
| Story, About olive oil, Contact, Shipping & returns, Privacy, Terms, 404 | ✅ |
| `sitemap.xml`, `robots.txt`, per-page metadata, JSON-LD (Organization, WebSite, Product) | ✅ |
| Full RTL with `lang`/`dir`, Arabic type stack, responsive 320 → 1920 px | ✅ |
| Optional English locale at `/en` | ✅ |
| Floating WhatsApp button with prefilled Arabic message (incl. order reference) | ✅ — activates when `NEXT_PUBLIC_WHATSAPP_NUMBER` is set |

### Intentionally not done

- **No payment gateway, no simulated success.** COD is the only enabled method.
  InstaPay is code-complete but off until a handle is confirmed.
- **No invented business data.** Prices, stock, shipping fees, contact details,
  certifications, reviews and testimonials are *sample or absent*, never fabricated.
  The catalog is currently flagged as sample (`NEXT_PUBLIC_SAMPLE_CATALOG=true`),
  which shows a visible notice and suppresses Product structured data.
- **Newsletter form is disabled** until `NEWSLETTER_WEBHOOK_URL` is provided.
- **Admin catalog CRUD** — products live in code (`src/lib/products.ts`) so that
  prices are always re-validated server-side. The admin product screen is read-only.
- **No reviews widget** (`flags.reviewsEnabled = false`).

---

## Configuration

Everything site-specific lives in two files:

- `src/lib/config.ts` — brand strings, contact channels, shipping zones & fees,
  payment switches, feature flags.
- `src/lib/i18n.ts` — the complete Arabic/English copy dictionary (single source
  of truth for UI text).

Environment variables are documented in `.env.example`. The important ones:

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, used for metadata, sitemap, robots |
| `NEXT_PUBLIC_SAMPLE_CATALOG` | `true` keeps the "sample prices" notice visible |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Enables the floating WhatsApp button |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin login (dev default: `admin@alsuliman.local` / `alsuliman-dev`) |
| `ADMIN_SESSION_SECRET` | Session signing key — **required in production** |
| `DATABASE_FILE` | Override the SQLite path |

Contact/social variables render the corresponding UI element **only when set**,
so an unconfigured site never shows an empty phone icon or dead link.

### Branding

The real logo is installed (`public/brand/logo.png`, background keyed out to
transparent, ~640 px wide; `brand.logoMode: "image"`). The SVG mark in
`src/components/brand/Logo.tsx` is a leftover placeholder that still renders on
the admin bar, 404 and error pages — replace those usages with the image if you
want full consistency.

The bottle photography in `public/products/` is derived from the supplied
product photos (currently the minimalist full-bottle shot). Only the background
is removed — the bottle itself is never altered.

---

## Admin

`/admin` — orders dashboard backed by SQLite.

- **Login**: HMAC-signed, `httpOnly` session cookie, 8-hour expiry, constant-time
  credential comparison.
- **Orders**: list, filter by status, detail view, status transitions
  (pending → confirmed → shipped → delivered, or cancelled).
- **Products**: read-only catalog view (edit `src/lib/products.ts` instead).

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before deploying, and set
`ADMIN_SESSION_SECRET` (`openssl rand -hex 32`). The admin path is excluded from
`robots.txt`; consider adding HTTP basic auth at the reverse-proxy layer as well.

---

## Architecture notes

```
src/
  app/[locale]/          # locale-prefixed storefront (ar | en), root layout
  app/admin/             # standalone Arabic-only admin (own root layout)
  app/actions/           # server actions: submitOrder, admin auth & status
  app/sitemap.ts         # robots.ts
  components/            # layout, home, store, admin, ui primitives
  lib/                   # config, i18n, products, cart-store, orders, auth, db
public/products/         # bottle cutouts and graded variants
data/                    # SQLite (git-ignored)
```

- `src/proxy.ts` redirects `/` → `/ar` and any unprefixed storefront path → its
  `/ar/...` equivalent, so every page has exactly one canonical URL. `/admin` is
  deliberately left unprefixed (see below).
- **Admin is gated in `src/proxy.ts`**, before any page renders. Unauthenticated
  requests to `/admin/*` are redirected to `/admin/login`; the same signed-token
  check runs again in each page/action as defence in depth.
- **Orders are re-priced on the server.** The client sends only
  `{ productId, variantId, qty }`; unit prices, shipping and totals are computed
  from `src/lib/products.ts` inside the action, so a tampered cart cannot alter
  what is charged.
- **Idempotency**: the checkout form generates a UUID key before the first
  submit; resubmitting returns the existing order instead of creating a duplicate.
- **Stock** is validated server-side against the catalog value.
- Orders are `await connection()`-gated on the confirmation page so the reference
  is only rendered after the write is committed.

---

## Data honesty

Anything that has not been confirmed by the business owner is either empty or
explicitly marked as sample. This includes: prices (235/330/420 EGP), stock
counts, shipping fees, delivery estimates, and the "3 generations" heritage
framing on the story page. Before launch:

1. Confirm real prices/stock, then set `NEXT_PUBLIC_SAMPLE_CATALOG=false`.
2. Confirm shipping fees in `src/lib/config.ts`.
3. Add real contact details, address and social links.
4. Remove or rewrite any placeholder narrative that the owner has not approved.
