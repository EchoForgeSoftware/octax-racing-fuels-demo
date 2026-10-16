# Hosting, security and search launch

Prepared 16 October 2026. The code is ready for configuration and testing; no
hosting purchase, production deployment, merchant onboarding or legal approval
has been performed. Policies are drafts until the business has them reviewed.

## Recommended hosting

Use **Vercel Pro for the storefront and Supabase Pro for accounts, orders and
private Ozow functions**. This fits the existing Next.js code, gives reviewable
deploy previews and avoids maintaining a server. Current published starting
prices are USD20/month for Vercel Pro and USD25/month for Supabase Pro: budget
about USD45/month before usage, extra projects/seats, tax, domain, transactional
email and Ozow fees. Set spending alerts. Review the provider quote before buying.

- [Vercel pricing](https://vercel.com/pricing)
- [Supabase pricing](https://supabase.com/pricing)
- [Vercel Hobby restrictions](https://vercel.com/docs/plans/hobby): personal,
  non-commercial use; use Pro for this business.

**Cloudflare Pages + Supabase** is the lower-cost alternative while this app
remains a static export. Pages has a free static tier, subject to its limits.
Build with `npm run build`, publish `out`, and retain its generated `_headers`.
The backend remains on Supabase. A future move to server-rendered Next.js would
need a different deployment configuration.

- [Cloudflare Pages](https://www.cloudflare.com/products/pages/)
- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Static response headers](https://developers.cloudflare.com/pages/configuration/headers/)

Do not launch the store on GitHub Pages. Its terms prohibit using it primarily
for online business/ecommerce. The existing workflow is a historical demo
example, not the production recommendation.
[GitHub terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#github-pages)

## Deploy to Vercel

1. Use a business-owned account, enable administrator MFA, and import this repo
   into a Pro project. The checked-in `vercel.json` builds and serves `out` as
   static files, with security headers. No Vercel backend functions are required.
2. Add the final custom domain and redirect its alternative hostname to one
   canonical hostname. Verify HTTPS. Keep preview deployments restricted and
   separate from live credentials and customer data.
3. Copy the public variables in `.env.example` to the host's production build
   environment. Set `NEXT_PUBLIC_SITE_ORIGIN=https://YOUR-REAL-DOMAIN`,
   `NEXT_PUBLIC_BASE_PATH=` (empty), real support/business/privacy details and
   the public Supabase/Turnstile keys. Never put Ozow secrets, Turnstile secrets
   or a Supabase service-role key in a `NEXT_PUBLIC_*` value.
   Set the base path to empty in the **Preview** environment too: hosted exports
   are served at the hostname root, unlike the local demo prefix. Give previews
   the public staging backend/CAPTCHA keys and keep their payment flag off until
   that staging environment is configured. Never share live customer data there.
4. Complete Supabase Auth/SMTP/CAPTCHA setup in README and staging payment
   testing in [OZOW.md](OZOW.md). Deploy SQL and functions separately: a Vercel
   build does not deploy them. Keep live payments disabled until verified.
5. Have the final policies and business practices reviewed. Only then set
   `NEXT_PUBLIC_POLICIES_REVIEWED=true` and `NEXT_PUBLIC_SITE_INDEXABLE=true`.
   Run `npm run launch:check`, test, build and deploy. The guard checks obvious
   missing settings; passing it is not legal certification or a penetration test.
6. Vercel preview builds remain noindex automatically. On Cloudflare, configure
   preview environment variables with indexing false and use a separate staging
   backend. Environment changes always require rebuilding the static files.
7. Check the deployed headers and browser console, actual confirmation/reset
   emails, account isolation, and the complete Ozow round trip. Check a small
   production payment and settlement before inviting customers.

## Security included in the code

- Customer tables use row-level security; browser roles cannot change payment
  status or read private payment capabilities. Automated tests execute the actual
  SQL migrations and permissions in isolated PostgreSQL.
- Ozow totals are calculated on the server. Signed webhooks must match the
  amount, currency, merchant, environment and order. Retries are idempotent;
  duplicate/out-of-order events cannot undo paid status.
- A generated Content Security Policy allows exact build script hashes and
  specified backend/CAPTCHA origins. Scripts do not use `unsafe-inline` or
  `unsafe-eval`. Inline styles remain allowed for the current UI/animation stack.
  Exported HTML is hardened after each build; do not edit it afterwards.
- Vercel and Cloudflare header configuration prevents framing and MIME guessing,
  limits referrers/browser features, enables HSTS on HTTPS, and disables caching
  and indexing of account/cart/checkout responses. `npm run serve` previews these
  protections locally; Next development mode does not use the production CSP.
- Turnstile support is wired into signup, login, password reset and Ozow creation.
  It becomes active only with real keys and provider configuration. Production
  Ozow creation refuses to run without its private Turnstile secret. Auth
  protection must also be enabled in Supabase; the browser widget alone is not
  protection. [Supabase CAPTCHA setup](https://supabase.com/docs/guides/auth/auth-captcha)
- Current terms acknowledgement is required for orders, with a version and
  server-stamped acceptance time. This is an audit record, not proof that every
  visitor read the policies. Existing historical orders are not backfilled.

Manual EFT totals still arrive from the browser and guest inserts can be sent
directly to Supabase. Treat those orders as untrusted requests: staff must verify
catalogue prices, delivery charge and cleared bank funds before accepting or
dispatching. CAPTCHA on Ozow does not protect that separate insert path. Monitor
abuse and move manual-order creation behind a rate-limited, verified server
endpoint if opening it broadly. No automatic dispatch or payment emails exist.

## Configure and operate before launch

- Require administrator MFA for hosting, Supabase, domain, email and Ozow; give
  staff only the access they need. Keep separate staging/production projects and
  credentials. Confirm function gateway IP handling and rate limits in hosting.
- Enable Supabase email confirmation, minimum password length 12, appropriate
  Auth rate limits and leaked-password protection where available. Configure
  exact redirect URLs and a production SMTP sender. Test expired reset links.
- Configure matching Turnstile hostname/sitekey/secret for the store. Save the
  secret in Supabase Auth and separately in private payment function secrets;
  never commit it. Verify bot challenges and failures on the actual domain.
- Review database policies after migrations, patch dependencies regularly and
  rerun the tests. Configure alerts for failed webhooks, function errors, unusual
  traffic, failed logins and spending. Do not log passwords, tokens or full
  customer payloads.
- Set a documented retention schedule for accounts, orders, payment audit rows,
  rate-limit rows, logs and backups. Limit staff access, test backup restoration,
  and establish how customers request access, correction or deletion. Legal
  record-retention obligations may require retaining some transactions.
- Review provider data-processing agreements, regions, subprocessors and
  cross-border transfers. Maintain an incident/breach response procedure with
  the privacy officer and adviser. These operational duties are not completed
  by adding a privacy page.

## South African business and legal review

Security controls reduce risk; no website can guarantee freedom from lawsuits.
Have a South African legal adviser review the actual business, products and
policies before enabling checkout and indexing. In particular:

- Supply the company's exact registration number, service/business address,
  working phone/email, privacy contact and any applicable VAT/seller disclosures.
  Verify the inherited FNB details against the original bank confirmation.
- Review the seller disclosures, ability to correct/review an order, acceptance
  process, cancellation/cooling-off rules and applicable exceptions under ECTA,
  plus CPA quality/remedy rights. Drafts preserve statutory rights and do not
  impose a blanket no-refunds clause. Confirm delivery promises, timelines,
  costs, complaint handling and safe return arrangements with the actual courier.
- Review POPIA processing grounds, notices, customer rights, provider/operator
  contracts, transfers, retention and security safeguards. Register the
  Information Officer and determine the business's PAIA manual/access duties.
  Publish the approved manual/access process when applicable.
- Fuels, methanol and additives need specialist product review: safety data
  sheets, accurate labels/claims, lawful storage/supply and dangerous-goods
  transport/returns. Obtain product-specific advice, merchant/courier acceptance
  and appropriate insurance. The website does not establish those approvals.
- No analytics/advertising trackers are installed by this work. Review privacy
  and consent requirements before adding them. Keep marketing consent separate
  from required terms acceptance; there is no mailing-list signup here.

Official starting points for the adviser:
[ECTA](https://www.gov.za/documents/electronic-communications-and-transactions-act),
[CPA](https://www.gov.za/documents/consumer-protection-act),
[Information Regulator / POPIA and PAIA](https://inforegulator.org.za/),
[Information Officer registration](https://eservices.inforegulator.org.za/services.aspx).
This is a review checklist, not a conclusion that these duties have been met.

## SEO included and launch checks

Public pages have titles, descriptions, canonical URLs and social metadata.
Product pages have their own generated images/social cards and structured data
with real variant prices, currency and made-to-order availability. Breadcrumbs
and Organization data are included; no invented reviews or ratings are used.
The sitemap includes public product/legal pages and excludes account/cart/payment
pages. Private pages remain noindex even when production indexing is enabled.

The default demo intentionally stays noindex. After the final domain is ready:

1. Verify business details, approved policies, product descriptions, prices,
   safety information and delivery availability. Rebuild for the canonical domain.
2. Check robots.txt, sitemap.xml, canonical tags, social images and redirects on
   the deployed domain. Remove indexing blocks only from production. Noindex is
   an indexing request, not access control; account data relies on authentication
   and database policies.
3. Verify the domain in Google Search Console and submit `/sitemap.xml`. Validate
   product pages with Google's Rich Results Test and inspect actual indexing.
4. Check mobile usability and Core Web Vitals on the deployed site. Review real
   search queries and improve useful product content. Metadata cannot guarantee
   rankings or rich results.

[Google structured-data requirements](https://developers.google.com/search/docs/appearance/structured-data/sd-policies),
[Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet),
[Robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

When policies change, update the policy version in site config and SQL, redeploy
the generated backend catalogue/functions and rebuild together as described in
OZOW.md. Keep the accepted policy versions available in the business records.
