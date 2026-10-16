# Reseller applications

The public `/agents/` page collects contact details, shop/entity information,
public shop/social links, product interests, volume and handling arrangements.
It has a review step, privacy acknowledgement and explicit manual approval.
An application never adds someone to a dealer list or grants reseller access.
No business decision or outbound test email was made during implementation.

## Activate

1. Create/connect the Supabase project as in README. Run `supabase/schema.sql`,
   then `supabase/resellers.sql`. The reseller script can be rerun without
   removing applications. It does not depend on the Ozow merchant setup.
2. Create a [Resend](https://resend.com/docs/introduction) account, verify a
   business-owned sending domain and configure SPF/DKIM and an appropriate DMARC
   policy with the email administrator. Use a domain-restricted sending key.
3. Choose the real review inbox. Copy `supabase/.env.resellers.example` to the
   ignored `.env.resellers.local`, set the fixed `RESELLER_TO_EMAIL` and verified
   `RESELLER_FROM_EMAIL` (plain addresses), `RESEND_API_KEY`, Turnstile secret
   and exact allowed origins. Keep `RESELLER_ENABLED=false` until tested.
4. Configure the public Turnstile site key for the storefront hostname. The
   private function independently requires a valid `reseller` action and allowed
   hostname; an account/payment CAPTCHA token cannot be substituted.
5. Deploy `npx supabase functions deploy reseller-application`, and upload
   private secrets with `npx supabase secrets set --env-file supabase/.env.resellers.local`.
   The function has gateway JWT verification off for guest applicants; origin,
   CAPTCHA, bounded inputs, rate limits and database permissions are enforced
   inside it. Supabase supplies the service-role credentials privately.
6. In an isolated staging environment, enable the private flag and set public
   `NEXT_PUBLIC_RESELLER_ENABLED=true`. Add public Supabase URL/key and Turnstile
   key to the build environment, rebuild and test. Confirm the real recipient,
   sender and Reply-To. The applicant is Reply-To only and cannot choose a
   recipient or turn this endpoint into an arbitrary mail relay.
7. Test failed mail delivery, missing/invalid CAPTCHA, unknown products, long
   input, repeated submissions and attempted reads/updates as browser roles.
   Establish alerts/manual checks for pending notifications before opening it.

The form remains available for filling/review in the local demo, with sending
disabled until setup is explicitly enabled. It does not claim a successful
submission or email delivery while unconnected. Do not put provider secrets in
public environment variables or source control.

## Team review

Emails include the applicant's email, phone, business location, shop links and
the application reference. All details/links are unverified submissions; staff
must assess them and request supporting information directly where needed.
No submitted URL is fetched by the backend. Browser roles cannot read or write
the private `reseller_applications` table or its reservation function.

Use the Supabase dashboard's `reseller_applications` table to review submissions:
set `status` to `in_review`, record internal `review_notes`, then set `approved`
or `declined`. Communicate the decision and any trading terms directly to the
applicant. The status alone does not send a decision email, create an account,
set pricing/credit limits or appoint an agent. An admin UI is not included.
Restrict staff access and agree on the retention/deletion process with the
privacy contact. Resend and the selected mail provider also process applications;
review the provider arrangements before real submissions.

## Reliability and abuse handling

Applications are saved before notification. Same-page retries use a stable
random reference, hashed capability and request fingerprint; conflicting reuse
is rejected. Valid submitted data is never returned from an unauthenticated
lookup endpoint. Each network bucket is limited to 5 submissions/minute and
40/day; verify the gateway's forwarded-IP handling and monitor traffic/spending.

Email uses a fixed recipient/sender and plaintext content. The provider's
idempotency key prevents duplicate notification on a lost response within its
24-hour retention window. A pending application older than 23 hours is held
for operator reconciliation instead of automatically sending it again after
that window. Monitor `notification_status=pending` and function errors. Check
Resend logs to establish whether a message was accepted/delivered, then notify
the team manually if necessary. `sent` means provider acceptance, not proof of
inbox delivery. Provider failures still return a truthful saved receipt with
an explicit delayed-notification message. There is no background retry worker.

Provider references:
[Send Email API](https://resend.com/docs/api-reference/emails/send-email),
[Idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
