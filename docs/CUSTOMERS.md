# Customer area and payment history

Guests see **Sign in** in the header. After authentication, **Customer** appears
in desktop navigation and the mobile menu, linking to `/account/`. Signing out
removes it. Hiding the tab is only navigation behaviour: Supabase row-level
security independently restricts profile/order reads to the authenticated owner.
The account route remains noindex and outside the public sitemap.

The customer area has Orders & items, Payments and Delivery sections. Orders show
saved line items/quantities/prices, totals, courier and fulfilment/payment status.
Reorders use current catalogue pricing. History loads 25 orders at a time with
a stable ID cursor and a Load older orders button; summaries describe only the
loaded history. Refresh reloads the latest page. Account changes invalidate
in-flight responses and hide the previous account's history immediately.

## Connect or upgrade the backend

Complete the Auth/SMTP/CAPTCHA setup in README. Run the updated `schema.sql`,
then `ozow.sql` in Supabase SQL Editor, including when upgrading an existing
project. These scripts are rerunnable. Reapplying the payment script after the
base schema restores its payment-specific insert policy and notification logic.
The frontend needs both public Supabase values and a rebuild. No real user
account, password reset or live payment has been tested without that setup.

The new order columns are `payment_confirmed_at`, `payment_confirmed_amount`
and `payment_reference`. Browser inserts cannot manufacture confirmations and
browser roles cannot update orders. A trusted status change to paid records the
current time, full order amount and reference. Verified Ozow notifications also
record the provider transaction reference. Later dispatch, cancellation or
duplicate notifications preserve the original confirmation record. A late paid
Ozow notification can record money received without undoing a cancelled order.

Confirmation time means the time OCTA recorded confirmation, not necessarily
the bank's settlement timestamp. Existing paid/dispatched orders are not given
invented dates or amounts. The Orders section labels older paid records as
marked paid with no recorded confirmation date. Payments lists only explicit
recorded confirmations and excludes staging/test payments from real-money totals.
This is full-order confirmation history, not a bank statement or a ledger of
partial payments, refunds, chargebacks or adjustments.

## Business tracking

In Supabase Table Editor, use `orders` to review customer details, items, total,
status, user_id and payment-confirmation fields. Filter by user_id to review one
customer. Check actual cleared EFT funds and catalogue/delivery totals before
changing status from awaiting_payment to paid. That change stamps the confirmed
amount/time; then change status to dispatched when appropriate. Ozow is marked
through verified notifications. Follow up on paid cancelled orders manually.

Guest orders remain business-visible but are not automatically attached to an
account created later. An email address match alone is not proof of ownership.
The customer must order while signed in for automatic account history. Internal
business tracking uses authorised Supabase operator access; no public staff or
customer impersonation tool has been added.

Before launch, test signup, confirmation, sign-in/out, reset, two separate
customers, an empty account, more than 25 orders, failed history loading, staff
EFT confirmation and a staging Ozow round trip. Keep production/test projects
separate and restrict staff access to customer records.

## Try a local demo customer

For a local preview before Supabase is created, build with `NEXT_PUBLIC_CUSTOMER_DEMO=true` and run the usual preview server. Leave Supabase values empty, indexing off and live service switches off. In PowerShell: `$env:NEXT_PUBLIC_CUSTOMER_DEMO='true'`, then `npm run build`, then `npm run serve`. Remove the temporary flag afterwards with `Remove-Item Env:NEXT_PUBLIC_CUSTOMER_DEMO`.

At the local sign-in page use **customer@example.test** / **OctaDemo2026!**. The demo shows Alex Demo, four sample orders, two example payment confirmations totalling R3,320, one pending payment and one cancelled order. Try Orders & items, Payments, Delivery details, Order again, sign out, and sign in again. The header Customer tab follows the demo sign-in state.

This is a browser-only demonstration of the customer interface, not a test of Supabase authentication, payment verification or reset emails. It only runs on exact loopback hosts with the explicit build flag and no connected account service. The build rejects live account/service or indexing configuration with this flag. No backend orders, emails or payments are created. Only a demo sign-in marker and sample profile are kept in this tab's session storage; no password is stored. Saved sample details survive refresh in the same tab. Reordering changes the normal local cart; checkout remains closed without Supabase. Do not use real customer details in the demo. For a deployment rebuild without this flag.

