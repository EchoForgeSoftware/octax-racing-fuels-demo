import "./env.mjs";
import { pathToFileURL } from "node:url";
import { BASE_PATH, INDEXABLE, LEGAL, ORIGIN, SITE, hasBankDetails, hasContactEmail, hasContactPhone } from "../site.config.mjs";

export function launchProblems(config) {
  const issues = [];
  const host = new URL(config.origin).hostname;
  if (/(\.github\.io|\.vercel\.app|\.pages\.dev|\.example|\.test)$/.test(host) || host === "localhost") issues.push("Set the final custom HTTPS domain.");
  if (config.basePath !== "") issues.push("Use an empty base path for the production domain.");
  if (!config.contactEmail) issues.push("Publish a working customer support email.");
  if (!config.contactPhone) issues.push("Publish a working international-format support phone number.");
  if (!config.site.registrationNumber.trim()) issues.push("Publish the company registration number.");
  if (!config.site.businessAddress.trim()) issues.push("Publish the business address for service and customer enquiries.");
  if (!config.site.privacyOfficer.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.site.privacyEmail) || /\.(example|test|invalid)$/i.test(config.site.privacyEmail)) issues.push("Publish the real privacy contact and email.");
  if (!config.reviewed) issues.push("Have the policies reviewed and confirm NEXT_PUBLIC_POLICIES_REVIEWED=true.");
  if (!config.bankDetails) issues.push("Complete and verify the EFT bank details.");
  if (config.accountsEnabled && !config.captchaConfigured) issues.push("Configure the Turnstile site key, Supabase CAPTCHA secret and payment CAPTCHA secret, then test them.");
  return issues;
}

export function customerDemoProblems(env) {
  if (env.NEXT_PUBLIC_CUSTOMER_DEMO !== "true") return [];
  const problems = [];
  if (env.NEXT_PUBLIC_SITE_INDEXABLE === "true") problems.push("Turn off the local customer demo before enabling search indexing.");
  if (env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_ANON_KEY) problems.push("The local customer demo must not be built with Supabase credentials.");
  if (env.NEXT_PUBLIC_OZOW_ENABLED === "true" || env.NEXT_PUBLIC_RESELLER_ENABLED === "true") problems.push("The local customer demo must not enable live payment or reseller services.");
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const demoIssues = customerDemoProblems(process.env);
  if (demoIssues.length) { console.error(demoIssues.join("\n")); process.exit(1); }
  const issues = launchProblems({ origin: ORIGIN, basePath: BASE_PATH, site: SITE, contactEmail: hasContactEmail,
    contactPhone: hasContactPhone, reviewed: LEGAL.reviewed, bankDetails: hasBankDetails,
    accountsEnabled: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    captchaConfigured: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) });
  if (issues.length) {
    console.log(`Launch requirements still outstanding:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    if (INDEXABLE || process.argv.includes("--strict")) process.exitCode = 1;
    else console.log("Preview build allowed; search indexing remains disabled.");
  } else console.log("Published business details and policy-review configuration are complete. Complete the operational launch checks as well.");
}
