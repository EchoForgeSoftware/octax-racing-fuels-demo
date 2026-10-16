import { getSupabase, accountsEnabled } from "./supabase";
import { LEGAL } from "./site";

export const resellerEnabled = accountsEnabled && process.env.NEXT_PUBLIC_RESELLER_ENABLED === "true";
export type ResellerDetails = {
  name: string; email: string; phone: string; business: string; entityType: string;
  registration: string; vat: string; address: string; city: string; province: string;
  website: string; social: string; description: string; storage: string;
  volume: string; products: string[];
};
export type ApplicationReceipt = { ref: string; notification: "sent" | "pending" };
export async function submitReseller(details: ResellerDetails, ref: string, token: string, captchaToken: string): Promise<ApplicationReceipt> {
  const sb = getSupabase();
  if (!sb || !resellerEnabled) throw new Error("Reseller applications are being connected. Please check back once applications open.");
  const { data, error } = await sb.functions.invoke("reseller-application", { headers: { Authorization: "" },
    body: { ref, token, details, privacyAcknowledged: true, privacyVersion: LEGAL.version, captchaToken } });
  if (error) {
    let message = "We couldn't confirm your application. Your details are still on this page; please try again.";
    if (error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (typeof response?.error === "string") message = response.error;
    }
    throw new Error(message);
  }
  if (!data || data.ref !== ref || !["sent", "pending"].includes(data.notification)) throw new Error("Your application could not be confirmed. Please retry on this page.");
  return data;
}
