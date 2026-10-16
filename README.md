# OCTA Performance

E-commerce site for OCTA Performance, a brand of ZRG-X (PTY) LTD:
OCTA-X ethanol 96%, OCTA-M methanol and OCTA-BOOST octane booster, with
catalogue, cart, EFT checkout and optional customer accounts. Product names, UN numbers, mix ratios
and label wording come from the real product labels; prices and pack sizes from
the client's price list (VAT included, courier excluded). No stock is tracked.

Product labels and containers are drawn as SVG in `src/components/brand/` and
`src/components/pack/`, driven by the `label` data in `src/lib/products.ts`.

## Stack

- Next.js (App Router) with static export (`output: "export"`)
- TypeScript, Tailwind CSS v4
- GSAP (with ScrollTrigger) for the animated hero, page transitions and scroll reveals
- Static files ready for Vercel or Cloudflare Pages (GitHub Pages is the demo host)
- Supabase Auth for customer sign-in and password resets; Supabase Postgres for
  delivery profiles and orders, protected with row-level security
- Ozow hosted payment checkout through private Supabase Edge Functions (disabled
  until merchant onboarding and setup are complete)

## Run and build

```bash
npm install
npm run dev      # local dev at http://localhost:3000/octax-racing-fuels-demo
npm test         # orders, payment verification, PostgreSQL permissions and retries
npm run build    # static export to ./out
npm run serve    # production preview with the same browser security headers
npm run launch:check # check required production settings; fails until supplied
```

`npm run build` generates icons, individual product/social images and llms.txt,
checks launch settings and exports the site. Its postbuild step adds per-page
script-hash security policies and Cloudflare headers; Vercel uses `vercel.json`.
It also generates the backend payment catalogue from the storefront's current
prices and delivery rates.

## Agents / reseller applications

The Agents tab includes a business application and review step, with private
Supabase storage and a Resend email notification prepared behind feature flags.
No applicants are automatically approved. The receiving email and mail-provider
setup are still required. Follow [docs/RESELLERS.md](docs/RESELLERS.md).

## Technical data sheets

OCTA-BOOST, OCTA-SHOT and OCTA-TORQUE have branded PDF technical sheets on the
information page and matching product pages. The supplied BOOST table replaces
the previous label ratios with the user's confirmation. See
[document sources and rebuild instructions](docs/DATA-SHEETS.md).

## Ozow payments

The checkout now includes Ozow alongside manual EFT. The website is openable as
a local preview while the payment integration stays disabled. Follow the
[Ozow setup guide](docs/OZOW.md) for merchant onboarding, the database migration,
private function secrets, deployment and staging tests. Customer banking details
are entered on Ozow's hosted page. Payment is confirmed through a verified
server notification, never through a browser redirect.

## Customer accounts and EFT checkout setup

The pages are implemented, but a Supabase project must be connected before
customers can register, sign in, reset passwords or place orders. With no keys,
the catalogue/cart and bank details remain visible, account forms explain that
setup is pending, and checkout submission is disabled. No order is reported as
received unless the database accepts it.

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Open **SQL Editor**, paste [supabase/schema.sql](supabase/schema.sql), and run
   it. It creates the profiles/orders tables, signup trigger, permissions and
   policies. It can be rerun without deleting existing rows.
3. From the project's **Connect** dialog or **Settings → API Keys**, copy the
   project URL and public **publishable key** (or legacy **anon** key). Copy
   `.env.example` to `.env.local` and fill in:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PUBLIC-KEY
   ```

   Both values are bundled into the browser. Never use a secret/service-role
   key here. Restart the development server after changing them.
4. In **Authentication → Sign In / Providers**, enable email/password login,
   keep email confirmation enabled, and set the minimum password length to 12
   characters or stronger.
5. In **Authentication → URL Configuration**, set **Site URL** to:

   ```text
   https://YOUR-PRODUCTION-DOMAIN/
   ```

   Add these exact **Redirect URLs** (including trailing slashes):

   ```text
   https://YOUR-PRODUCTION-DOMAIN/account/
   https://YOUR-PRODUCTION-DOMAIN/account/reset-password/
   http://127.0.0.1:3000/octax-racing-fuels-demo/account/
   http://127.0.0.1:3000/octax-racing-fuels-demo/account/reset-password/
   ```

   Email links return to the origin where the request was made. Keep the
   built-in confirmation/reset email links using `{{ .ConfirmationURL }}` so
   Supabase verifies the token before returning to the static site. If you
   change the domain, base path or local port, update the allowed URLs too.
   See [Supabase redirect URL guidance](https://supabase.com/docs/guides/auth/redirect-urls).
6. Configure **Authentication → Email → SMTP Settings** with your email provider
   for real customer delivery. Supabase's default sender is restricted and is
   unsuitable for public customer email. Test both confirmation and reset emails
   with a customer address; see [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp).
7. Configure Cloudflare Turnstile for the final domain: add the public site key
   to `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, enable CAPTCHA in Supabase Auth and save
   the matching secret there. Test sign-in, signup and reset with the provider
   enabled. See the [launch guide](docs/LAUNCH.md) for backend and hosting setup.
8. Add public environment values in the chosen host's build settings. Rebuild
   after changing them; static exports cannot read environment values at runtime.

Customers can save delivery details, view orders in batches of 25 with older
history available, see recorded payment confirmations and reorder
using current catalogue prices. Guest orders are saved with no account owner
and are visible to business operators in Supabase, but are not automatically
attached to accounts created later. Account/password pages have `noindex`
metadata and are excluded from the sitemap; database policies enforce access.
The **Customer** tab appears after sign-in and opens Orders, Payments and
Delivery sections. See [customer-area setup and business tracking](docs/CUSTOMERS.md)
for the updated SQL and payment-confirmation fields.

### EFT payments and order handling

The FNB bank details in `site.config.mjs` appear at checkout and on the order
confirmation, with copy buttons for the account number, branch code and payment
reference. Verify them against the original bank letter before launch. This
repository does not contain that PDF. Set `NEXT_PUBLIC_SUPPORT_EMAIL`
before launch so the proof-of-payment link reaches the business.

Orders start as `awaiting_payment`. Use **Table Editor → orders** to view guest
and customer orders, verify the amount/reference against the actual bank
transaction, then manually change the status to `paid`, `dispatched` or
`cancelled`. Manual EFT does not confirm bank transfers or send order emails
automatically. Its prices and delivery totals are sent from the browser: staff
must check them against the catalogue before accepting or fulfilling an order.
Ozow uses separate server-calculated prices and signed notifications when
enabled; see the setup guide. A failed save keeps the cart and offers a retry; retries in the same
checkout reuse the reference to avoid duplicate orders after a lost response.

### Connection checks before launch

- Register a test customer, confirm the email, sign out and sign back in.
- Request a password reset, follow its email link and sign in with the new
  password. An expired link should offer to send a fresh link.
- Save delivery details; confirm checkout prefills them after signing in.
- Place one guest order and one signed-in order. Check both in Supabase; only
  the signed-in order should appear in that customer's history.
- Sign in with a second customer and confirm the first customer's profile and
  orders are inaccessible. Customers must not be able to change payment status.
- Simulate a failed order save: checkout must keep the cart and show an error.
  Confirm the EFT reference and total appear after a successful save.

## URLs: one source of truth

Every absolute URL (canonical, sitemap, robots, Open Graph, JSON-LD) derives from
[`site.config.mjs`](site.config.mjs):

- `ORIGIN` + `BASE_PATH` -> `SITE_URL`
- `INDEXABLE` toggles robots and per-page meta between noindex (demo) and index.

`BASE_PATH` also feeds `next.config.mjs` so assets and links resolve under the
GitHub Pages sub-path.

## Production handoff

When the production domain is known:

Follow [docs/LAUNCH.md](docs/LAUNCH.md) for hosting, the production environment,
security configuration, seller disclosures, legal review and SEO verification.
The default preview remains excluded from indexing. Production indexing requires
the final domain, real business details and reviewed policies; the build blocks
obvious incomplete settings when indexing is enabled.

## Deployment

The historical demo is served from GitHub Pages on the `gh-pages` branch: `npm run build`
produces the static `out/`, which is published to that branch. A ready-to-use
GitHub Actions workflow that automates this on every push to `main` is kept in
[docs/github-pages-workflow.yml.example](docs/github-pages-workflow.yml.example);
move it to `.github/workflows/deploy.yml` and set the Pages source to "GitHub
Actions" once a token with the `workflow` scope is available. Use Vercel Pro or
Cloudflare Pages for the commercial storefront; do not use GitHub Pages as the
live ecommerce host. No deployment has been performed by this setup work.

## Attribution

Made and maintained by [Echo Software](https://echosoftware.co.za).
