// Sends email through Resend (https://resend.com) from the verified
// octa-boost.com domain. The RESEND_API_KEY secret is set in Supabase
// (Edge Functions → Secrets) and never leaves the function. Without it,
// nothing is sent and orders carry on as normal.
import type { Email } from "./app/backoffice/orderEmail.ts";

const FROM = "OCTA Performance <orders@octa-boost.com>";

export async function sendEmails(emails: Email[]): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!key) return;
  for (const email of emails) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: email.to, subject: email.subject, html: email.html, text: email.text,
          ...(email.replyTo ? { reply_to: email.replyTo } : {}) }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) console.warn(`Email not sent (${response.status})`);
    } catch {
      console.warn("Email not sent");
    }
  }
}
