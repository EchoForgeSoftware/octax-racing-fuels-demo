import { SITE, LEGAL, hasContactEmail } from "@/lib/site";

export function BusinessDetails() {
  return <section className="border-2 border-ink bg-panel p-5 text-ink">
    <h2 className="font-display text-xl">Seller information</h2>
    <dl className="mt-4 space-y-3 text-sm">
      <div><dt className="kicker text-muted">Legal entity</dt><dd className="mt-1">{SITE.legalName}, trading as {SITE.name}</dd></div>
      <div><dt className="kicker text-muted">Company registration</dt><dd className="mt-1">{SITE.registrationNumber || "To be published before launch"}</dd></div>
      <div><dt className="kicker text-muted">Business address</dt><dd className="mt-1 whitespace-pre-line">{SITE.businessAddress || "To be published before launch"}</dd></div>
      <div><dt className="kicker text-muted">Customer support</dt><dd className="mt-1">{hasContactEmail ? <a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a> : "To be published before launch"}</dd></div>
      <div><dt className="kicker text-muted">Privacy contact</dt><dd className="mt-1">{SITE.privacyOfficer || "To be published before launch"}{SITE.privacyEmail && <> · <a className="underline" href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a></>}</dd></div>
    </dl>
    {!LEGAL.reviewed && <p className="mt-4 text-xs text-muted">Preview policies are being finalised before online trading opens.</p>}
  </section>;
}
