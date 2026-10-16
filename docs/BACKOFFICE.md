# Back-office demo and launch handoff

The current back office is a browser-only demonstration, available at `/admin/` when `NEXT_PUBLIC_CUSTOMER_DEMO=true`, indexing is off, no Supabase credentials are present and the hostname is loopback or exactly listed in `NEXT_PUBLIC_DEMO_HOSTS`. The public Cloudflare demo host can be listed as `octa-performance.pages.dev`. All sample logins are public. This is not secure storage for real business records, even though the UI follows different roles. There are no real staff accounts, payment transactions or automatic document emails.

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

The domains zrg-x.com and octa-boost.com are noted for later; the site still deploys to octa-performance.pages.dev.

FNB statements: Online Banking → Accounts → Transaction History → choose the dates → Download → **CSV**. PDF statements are not read.

## Orders, delivery and stock

- **Delivery area:** free own delivery within 35 km of Benoni, Brakpan, Boksburg and Kempton Park (`src/lib/courierRates.ts`, mirrored in the payment server). The town is read from the city field; unknown towns pay courier. Because of the radius this also covers Johannesburg, Sandton, Randburg, Centurion, Heidelberg and Delmas.
- **Pending orders:** every new invoice starts "pending delivery" and shows on the dashboard until the client signs for the goods on screen. The invoice PDF carries a delivery note (method, paid status, name, surname, date, signature and the label disclaimer).
- **Order takers:** Danium and reps can create invoices (orders) and sign deliveries, but cannot change prices; costs are filled in from the catalogue on save.
- **Stock:** Suppliers → Stock book-in (cost ex or incl VAT, batch, expiry, selling price with profit and under-cost warning) and Stock control (FIFO batches, old/expiring stock warnings, stock take and missing-stock value).

## Reps, referrals and customer accounts

- **Reps page:** each rep (or a main admin) fills in ID number, address and bank details. Referrals record the client, commission %, and who signs for the company as Director, Manager or Accountant. Commission is earned on the first fully paid invoice after the agreement (net of courier, and of VAT once VAT-registered) and is due within 14 days. **Paid** records the payment and unlocks the Acknowledgement of Payment PDF.
- **Customer Information Form:** on the client page (for private sales: quote, pro forma, invoice) and at checkout ("Open an account"). Authorised buyers each get an email to set their own password; nobody types passwords for other people. Live, they are linked in `bo_client_users`.
- **Checkout:** order on a personal name or company details. Company orders are saved as customers; personal orders can tick "Save me as a customer". In the demo, a sample order creates an unpaid website invoice and the customer in the back office.
- **Pro forma invoices:** Quotes → New pro forma (numbered PRO-0001, converts to an invoice like a quote).

## Supabase foundation

Run `schema.sql`, `ozow.sql`, `resellers.sql`, then `backoffice.sql` in a separate test project. `backoffice.sql` is rerunnable and seeds no users or records. Create real staff through Supabase Auth and provision `bo_staff` with verified Auth UUIDs using a trusted operator; never assign staff roles from browser metadata or arbitrary email input. Link customers by verified UUID after ownership checks. Assign a rep's staff UUID in `bo_clients.rep_user_id`.

The foundation separates private product/document costs, notes and tier lists from public catalogue/customer records. Row-level security limits reps to assigned customers and customers to their own documents/prices. Browser roles have read access only where allowed and cannot modify staff, documents, payments or number sequences. Service-role credentials stay private. Do not put real data in JavaScript seed files or upload demo browser backups to the live database.

**The live adapter is not implemented.** Connecting Supabase keys disables the demo and leaves staff access closed. Before live use, build trusted Edge endpoints with verified-role checks for every action, transactionally issued numbers, validated totals and costs, audit records, quote conversion, payment idempotency/overpayment guards, immutable issued invoices and credit notes, protected supplier attachments, email delivery and backup/recovery. The existing customer checkout/Ozow functions still use their current catalogue; back-office prices must be integrated into server-side quoting before live changes can affect charges. Never enable browser writes as a shortcut.

## Preview and deployment

Build the local review with the demo flag and normal local base path. To prepare Cloudflare output in PowerShell, set `NEXT_PUBLIC_SITE_ORIGIN=https://octa-performance.pages.dev`, `NEXT_PUBLIC_BASE_PATH=''`, `NEXT_PUBLIC_CUSTOMER_DEMO=true`, `NEXT_PUBLIC_DEMO_HOSTS=octa-performance.pages.dev` and `NEXT_PUBLIC_SITE_INDEXABLE=false`, then run `npm run build`. Keep Supabase values empty and Ozow/reseller switches false. Use the existing Pages project only; do not convert the project to a Worker. Deployment remains a separate step after review. No git commit is required.
