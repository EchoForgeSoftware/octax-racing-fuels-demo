# Ozow checkout setup

The checkout now has **Pay with Ozow** and **Manual EFT** choices. Until the
merchant account and backend are connected, the Ozow choice explains that it is
coming soon and cannot initiate a payment. Host the commercial storefront on
Vercel Pro or Cloudflare Pages; Supabase Edge Functions handle private payment
work. See [hosting and launch requirements](LAUNCH.md).

This is a prepared integration, not an activated merchant account. No Ozow
credentials are present and no real or staging payment has been made yet.

## What the customer will see

1. Add products and complete delivery details.
2. Select **Pay with Ozow** and continue to Ozow's hosted payment page.
3. Choose a bank and follow Ozow's payment steps.
4. Return to the store. The return page reads the verified backend status and
   displays pending, failed or paid. A redirect or URL parameter cannot mark an
   order paid. The original cart stays available until payment is confirmed.

Manual EFT still shows the supplied FNB details, payment reference and amount.
It remains a separate payment method with manual bank reconciliation.

## 1. Create the accounts

- Complete the [Supabase setup in README](../README.md#customer-accounts-and-eft-checkout-setup).
- Register your business with [Ozow](https://ozow.com/) and complete merchant
  onboarding. Ask for **One API**, the merchant site code, and staging access.
  Under **One API → Clients** in the matching Ozow dashboard, create a client
  with the `payments` scope and retain its Client ID and Client Secret privately.
- Use a separate Supabase project for staging tests. Keep staging orders out of
  the business's live dispatch process. The UI labels staging payments/orders
  as tests, and the webhook rejects test payments against production orders.

Ozow recommends One API for new hosted integrations. This implementation uses
OAuth client credentials and signed Svix webhooks. Legacy Payments API API keys
and private hash keys are different credentials and are not used here.

Sources: [Hosted Checkout](https://hub.ozow.com/integration-methods/apis/money-in/hosted-checkout/),
[quick start](https://hub.ozow.com/getting-started/quick-start/).

## 2. Apply the database setup

Run these files in the Supabase SQL Editor, in order:

1. [`supabase/schema.sql`](../supabase/schema.sql)
2. [`supabase/ozow.sql`](../supabase/ozow.sql)

Both can be rerun. If you rerun the base schema later, rerun `ozow.sql` afterwards
to restore the payment-specific insert policy. The second script adds private
payment records, atomic order reservations/status updates and request limits.
Browser roles cannot read private payment tokens or mark orders paid. Existing
orders remain manual EFT orders. Customers can only read their own order rows.

## 3. Deploy the functions

Using the official [Supabase CLI](https://supabase.com/docs/guides/cli), run from
the repository root (replace `YOUR_PROJECT_REF` with your project reference):

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run payment:catalogue
npx supabase functions deploy ozow-checkout
npx supabase functions deploy ozow-webhook
```

The repository's `supabase/config.toml` sets `verify_jwt = false` for these two
functions because checkout supports guests and Ozow uses a webhook signature.
The checkout function independently verifies any supplied customer session JWT.
Production checkout also requires a valid Cloudflare Turnstile proof. Configure
the public `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and private `TURNSTILE_SECRET_KEY`
from the same widget, with the storefront hostname allowed in Turnstile. Auth
uses the same widget with its secret configured separately in Supabase Auth.
The payment function validates the proof server-side against the `checkout`
action and allowed hostname. Staging without a secret is for isolated tests;
test with the actual widget before going live.
The webhook function independently verifies the Svix signature, timestamp and
raw request body before parsing the payment outcome.

Copy `supabase/.env.ozow.example` to the ignored file
`supabase/.env.ozow.local`. Fill in the staging client credentials and site code.
Keep `OZOW_ENABLED=false` until the webhook is configured. Upload the secrets:

```bash
npx supabase secrets set --env-file supabase/.env.ozow.local
```

Hosted Supabase functions provide their own `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`; never put the service-role key in a frontend env
file or GitHub Pages build. Do not commit your local secret file or paste the
Client Secret/webhook secret into chat.

Set `CHECKOUT_SITE_URL` to the public HTTPS site root including its base path.
The backend constructs `/checkout/ozow/` from this trusted value; it does not
accept a return URL from the customer. Add browser origins (without paths) to
`CHECKOUT_ALLOWED_ORIGINS`. Local previews can call the function if allowed,
but Ozow's return URL must be public. Use the deployed staging site or an HTTPS
tunnel for the full round trip; localhost returns are rejected by Ozow.

## 4. Connect the Ozow webhook

In the matching staging Ozow dashboard, open **One API → Clients → Manage
Webhooks** and create a subscription:

| Setting | Value |
| --- | --- |
| Endpoint | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/ozow-webhook` |
| Event | `transaction.complete` |
| Message type | **full** |

The full payload is required because it contains the merchant reference,
amount, currency and site code needed to validate the payment against the order.
Retrieve the subscription's signing secret (`whsec_...`), put it in
`OZOW_WEBHOOK_SECRET`, then upload the secrets file again. This implementation
uses the Svix signature, not the legacy `Hash` field. Do not configure the old
`notifyUrl` in addition to the webhook.

Source: [full transaction payload](https://hub.ozow.com/api-reference/one-api/schemas/transaction-complete-full-data/)
and [webhook verification](https://hub.ozow.com/integration-methods/apis/money-in/verify-a-webhook/).

## 5. Enable and test staging

1. Set `OZOW_ENABLED=true` in the function secret file, keeping
   `OZOW_ENVIRONMENT=staging`. Upload it again.
2. Set `NEXT_PUBLIC_OZOW_ENABLED=true` in the storefront's `.env.local`, alongside
   the public Supabase URL/key for the staging project. Restart the preview, or
   rebuild and publish the staging site. On Vercel or Cloudflare, set the flag
   and public Supabase values in that staging deployment's build environment.
   The GitHub Pages example intentionally keeps accounts and payments disabled.
3. Test success, pending, cancellation/failure, an expired payment link,
   duplicate notifications, browser refresh, and a delayed webhook. Test both
   a guest and a signed-in customer. The order must stay `awaiting_payment`
   until the matching signed successful notification is applied.
4. Check that a staging success says **Test payment confirmed**, shows a
   **TEST ORDER** label in account history, and is never treated as a live
   fulfilment instruction. A failed/pending payment keeps the cart.
5. If a notification was not delivered, replay it from Ozow's webhook management
   screen after resolving the error, then use **Check payment status** on the
   return page. The page reads backend state; it never guesses success from the
   redirect. Monitor function logs for rejected notifications and `5xx` errors.

The payment request uses Ozow's `Idempotency-Key` header with a stable order
reference. Retries reuse the original amount/expiry/body. Requests expire after
one hour; an expired request needs the business to check its status before a new
payment is started. Unchanged checkouts reuse their reference even after a tab
refresh. The backend limits
creation to 10 requests per forwarded IP per minute and status reads to 60;
also apply your host's gateway/bot protections before public launch. Verify the
deployment's forwarded-IP handling so untrusted headers cannot bypass limits.

## 6. Go live

After merchant approval and successful staging tests, configure the production
Supabase project, production Ozow client/site code and its separate full-payload
webhook secret. Set `OZOW_ENVIRONMENT=production` and enable the two feature
switches. Verify the real bank/contact details and the final public return URL.
Perform a small live payment yourself and confirm its settlement and order
status before opening payments to customers.

The client never receives Ozow credentials. A payment is marked paid only after
a signed notification matches the saved reference, expected amount, `ZAR`,
merchant site and production/test environment. Duplicate/out-of-order events
cannot undo `paid` or `dispatched` status. Refunds, disputes and accounting
reconciliation remain business operations; there is no automatic dispatch.

Both payment methods require the current terms acknowledgement. New orders
record a policy version and a server-generated acceptance time. When changing
the policies, update `LEGAL.version` in `site.config.mjs` and
`current_terms_version()` in `supabase/schema.sql`, apply both SQL files,
regenerate the payment catalogue, redeploy the functions and rebuild the site
together. Older checkout tabs must reload to accept the current version.

Prices/courier are calculated by the backend from the generated catalogue,
ignoring browser-supplied prices. After ANY product price, size or delivery-rate
change, regenerate the catalogue and redeploy `ozow-checkout` alongside the
storefront build. A storefront-only deployment does not update the payment
function. GitHub Pages deploys the static site; it does not deploy Supabase
functions or secrets.

## Local verification

```bash
npm test
npx tsc --noEmit
npx --yes --package=deno deno check --no-config --node-modules-dir=manual supabase/functions/ozow-checkout/index.ts supabase/functions/ozow-webhook/index.ts
npm run build
```

Tests run pricing/signature validation and an isolated PostgreSQL instance for
the actual payment migrations, role permissions, reservations, duplicate events
and limits. They do not contact Ozow, create accounts or move money. A real
staging deployment still needs the end-to-end checks above.
