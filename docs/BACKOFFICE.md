# Back office

The back office runs in two ways from the same screens and rules:

- **Live** (octa-boost.com/admin): staff sign in with their own accounts and every change is checked and saved by the `backoffice` Edge Function in Supabase. See "Live back office" below.
- **Demo** (demo.octa-performance.pages.dev/admin): sample records in the browser, for trying things out.

## Demo

The demo is a browser-only demonstration, available at `/admin/` when `NEXT_PUBLIC_CUSTOMER_DEMO=true`, indexing is off, no Supabase credentials are present and the hostname is loopback or exactly listed in `NEXT_PUBLIC_DEMO_HOSTS`. The public Cloudflare demo host can be listed as `octa-performance.pages.dev`. All sample logins are public. This is not secure storage for real business records, even though the UI follows different roles. There are no real staff accounts, payment transactions or automatic document emails.

## Try it

Use password **OctaAdmin2026!** with **zuan@example.test** or **zandro@example.test** for the main admin, **danium@example.test** for invoice/customer viewing, **accounts@example.test** for bookkeeping, or **rep@example.test** for a sample rep assigned two customers. Reps cannot create or change documents, see costs/profit, bank records or unrelated customers. The sample customer remains **customer@example.test** / **OctaDemo2026!**.

Main admins can add/edit customers, assign reps, choose Agent / Cash / Key customer, set retail/agent/bulk and agreed customer prices, and edit catalogue descriptions. Settings has rep management. Signed-in customer pricing takes effect in the sample shop/cart in the same browser. Extra merchandise/detailing items are available for quotes; they are not automatically activated for real checkout. New fuel, detailing and merchandise ranges stay coming soon until the business supplies pack sizes, pricing, product content and required safety data.

Create a quote, download its PDF and convert it to an invoice. Conversion links both documents and is idempotent. Saved document prices and costs are snapshots. Record part/full payments; paid invoices lock lines. Statements show opening balance, invoices, payments and closing balance over a date range. The dashboard separates website, private and agent invoiced sales. Gross profit is revenue on goods less recorded unit costs, excluding courier and overheads; it is not audited net profit. Sample costs and tier discounts need confirmation before any live use.

Invoices default to non-VAT invoices as the supplied notes request. Changing a customer's optional VAT number does not change the supplier's tax status. Settings supports a future VAT configuration, but this is a demo, not a certified invoicing or accounting system. Business address, phone, mailboxes, tax status and document wording must be confirmed before issuing real documents. Existing saved mailbox defaults are info@octa-boost.com and accounts@octa-boost.com; no mailbox ownership or email delivery was verified here.

All generated PDFs are marked **DEMO / SAMPLE DOCUMENT - NOT FOR PAYMENT**. Download creates a real PDF locally. **Prepare email** downloads it and opens a draft in the device's email app; the user must attach the file and send it. No message is sent automatically. Phone sharing uses the OS share sheet where supported and otherwise downloads the file.

The Excel template in Settings supports manual invoice/quote backup. It was generated in the project; no original user Excel template was supplied in this chat. Numbering in an offline workbook is not coordinated with the website: reserve a separate manual sequence before live use. Back up demo data exports a JSON snapshot; it is not a tested recovery system or a central business backup. Browser data is local to one origin/device; local preview and Cloudflare have separate stores. Clearing browser storage loses changes. Storage failures show a warning.

Supplier invoices and FNB CSV imports are demonstrations of basic bookkeeping. Use **Try a sample FNB statement** first. Do not upload actual bank statements or supplier/customer files to the public demo. Unique references can match open invoice balances; ambiguous references remain for review. Imported rows deduplicate by date, amount, description and balance. Identical legitimate transactions can share those values, so a live integration needs bank-issued transaction identifiers. There is no bank connection, payment initiation, tax filing, credit-note, refund or full accounting ledger implementation.

## Mailboxes (octa-boost.com)

| Mailbox | Used for |
| --- | --- |
| info@octa-boost.com | Public contact everywhere on the website, privacy contact |
| accounts@octa-boost.com | "Enquiries" line on every invoice, quote, statement and price list |
| sales@octa-boost.com | In-house sales login, set up as an **agent** client so it sees agent prices |
| admin@octa-boost.com | Owner of company sign-ups: Supabase, Cloudflare, email sending, domain, other services |
| zuan@, zandro@ | Main admins |
| danium@ | Invoices and customers, view only |
| accounts@ | Supplier invoices, bank, customer invoices, statements and balances |

The site runs at https://octa-boost.com (registered 18 Oct 2026 on Cloudflare, owner ZRG-X (PTY) LTD, auto-renew on); octa-performance.pages.dev still serves the same deployment. zrg-x.com is noted for later.

FNB statements: Online Banking → Accounts → Transaction History → choose the dates → Download → **CSV**. PDF statements are not read.

## Orders, delivery and stock

- **Delivery area (policy 2026-10-18):** local delivery can be arranged within 30 km of Benoni, Brakpan, Boksburg and Kempton Park (`src/lib/courierRates.ts`). Checkout and the payment server still charge the standard courier rate; local orders are flagged and the business confirms the local cost. Collected orders carry no delivery charge.
- **Courier fee:** Settings → Courier fee per pack. The demo shop, cart, checkout, policy page and new invoices use it. Live, the payment server still uses the fee in `supabase/functions/_shared/catalogue.json` until the setting is stored in Supabase and read by the server.
- **Costing:** Products & pricing → product → Open costing table. Lines entered ex VAT (incl VAT shown and editable): product price per litre (× litres per pack), sticker, container, cap, travel fee, plus any number of other costs with descriptions. Lines switch on and off (merch starts without container/cap). Purity received is editable and shows on the shop as "Current stock purity". When "use this total" is on, the total (incl VAT unless VAT-registered) becomes the product's cost for profit.
- **New products:** added products (e.g. hoodies in several sizes) appear on the shop under "New in" with sizes and price; ordering is through the contact page until online checkout reads the live catalogue.
- **Pending orders:** every new invoice starts "pending delivery" and shows on the dashboard until the client signs for the goods on screen. The invoice PDF carries a delivery note (method, paid status, name, surname, date, signature and the label disclaimer).
- **Order takers:** Danium and reps can create invoices (orders) and sign deliveries, but cannot change prices; costs are filled in from the catalogue on save.
- **Stock:** Suppliers → Stock book-in (cost ex or incl VAT, batch, expiry, selling price with profit and under-cost warning) and Stock control (FIFO batches, old/expiring stock warnings, stock take and missing-stock value).

## Reps, referrals and customer accounts

- **Reps page:** each rep (or a main admin) fills in ID number, address and bank details. Referrals record the client, commission %, and who signs for the company as Director, Manager or Accountant. Commission is earned on the first fully paid invoice after the agreement (net of courier, and of VAT once VAT-registered) and is due within 14 days. **Paid** records the payment and unlocks the Acknowledgement of Payment PDF.
- **Customer Information Form:** on the client page (for private sales: quote, pro forma, invoice) and at checkout ("Open an account"). Authorised buyers each get an email to set their own password; nobody types passwords for other people. Live, they are linked in `bo_client_users`.
- **Checkout:** order on a personal name or company details. Company orders are saved as customers; personal orders can tick "Save me as a customer". In the demo, a sample order creates an unpaid website invoice and the customer in the back office.
- **Pro forma invoices:** Quotes → New pro forma (numbered PRO-0001, converts to an invoice like a quote).

## Live back office

**How it works.** Every change goes through `src/lib/backoffice/actions.ts`. The screen applies it to its own copy at once, then sends it to the `backoffice` Edge Function, which verifies the user's Supabase session, works out their role, loads the records, runs the same action again on the full records and saves the result in one versioned commit (`bo_store_commit`): if someone else saved in between, it starts again from their version, so invoice numbers are never reused. The browser only ever receives what its role may see (`scope.ts`), and order takers' orders are rebuilt on the server from the catalogue (their customers only, the customer's price, costs filled in, no payments or delivery sign-off carried in). Each save is recorded in `bo_audit`. A save that is refused shows a red bar and the page returns to what is saved.

**Storage.** `supabase/backoffice-live.sql` adds `bo_store` (one row per record), the version counter and the staff invites. Only the service role (inside the function) can read or write them. Supplier invoice files (up to 5 MB) are stored in their own rows and fetched when opened.

**Staff.** The SQL invites zuan@, zandro@ (main admins), danium@ (orders, invoices and customers) and accounts@ (Accounts). Each person creates an account on octa-boost.com → Sign in → Create an account with that address, confirms it from the email, then opens /admin. The first sign-in links the invite to that account. Reps: a main admin adds the rep in Settings → Sales reps; the rep creates an account with the same email and signs in. To remove someone: Settings (reps), or for staff in SQL `update bo_staff set active=false where user_id=...`.

**First sign-in.** When the first main admin signs in, the catalogue and business details are set up from the website (`emptyData()` in `seed.ts`, including the sales@ agent client). There are no sample clients or documents.

**Shop prices.** The shop asks the function for the public catalogue (no costs), the courier fee and the signed-in customer's own prices, so price changes in the back office show on the website. Online checkout (when switched on) still charges the prices in `supabase/functions/_shared/catalogue.json`; keep them in step, or connect checkout to the live catalogue, before opening ordering.

**Deploy.**

1. Run `supabase/backoffice-live.sql` once in the Supabase SQL Editor (after `setup-all.sql`).
2. `npm run backoffice:function` (also runs before `npm test`) copies the shared rules into `supabase/functions/_shared/app/`.
3. `npx supabase login` (once, in your own terminal), then `npx supabase functions deploy backoffice --project-ref tjymijnvcaogzzqhxxqp --no-verify-jwt --use-api`.
4. Build and deploy the site as usual.

The function only answers requests from https://octa-boost.com and https://www.octa-boost.com (`ORIGINS` in `supabase/functions/backoffice/index.ts`).

## Supabase foundation (normalised tables)

`backoffice.sql` also holds normalised `bo_*` tables with row-level security, designed earlier for a direct-from-database setup. The live back office stores its records in `bo_store` instead; these tables are kept (empty) for reference and for `bo_staff`/`bo_audit`, which the live setup uses.

Run `schema.sql`, `ozow.sql`, `resellers.sql`, then `backoffice.sql` in a separate test project. `backoffice.sql` is rerunnable and seeds no users or records. Create real staff through Supabase Auth and provision `bo_staff` with verified Auth UUIDs using a trusted operator; never assign staff roles from browser metadata or arbitrary email input. Link customers by verified UUID after ownership checks. Assign a rep's staff UUID in `bo_clients.rep_user_id`.

The foundation separates private product/document costs, notes and tier lists from public catalogue/customer records. Row-level security limits reps to assigned customers and customers to their own documents/prices. Browser roles have read access only where allowed and cannot modify staff, documents, payments or number sequences. Service-role credentials stay private. Do not put real data in JavaScript seed files or upload demo browser backups to the live database.

Still to come for the live back office: credit notes and locked issued invoices, automatic email of documents, website orders landing in the back office, and checkout charging the live catalogue prices. Never enable browser writes to these tables as a shortcut; changes go through the function.

## Preview and deployment

Build the local review with the demo flag and normal local base path. To prepare Cloudflare output in PowerShell, set `NEXT_PUBLIC_SITE_ORIGIN=https://octa-boost.com`, `NEXT_PUBLIC_BASE_PATH=''`, `NEXT_PUBLIC_CUSTOMER_DEMO=true`, `NEXT_PUBLIC_DEMO_HOSTS=octa-boost.com,www.octa-boost.com,octa-performance.pages.dev` and `NEXT_PUBLIC_SITE_INDEXABLE=false`, then run `npm run build`. Keep Supabase values empty and Ozow/reseller switches false. Use the existing Pages project only; do not convert the project to a Worker. Deployment remains a separate step after review. No git commit is required.
