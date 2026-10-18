// Browser side of the live back office: calls the "backoffice" Edge Function
// (supabase/functions/backoffice) with the signed-in user's session token.
import { getSupabase } from "../supabase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export class BackofficeError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/** POST to the back-office function. Signed-in users send their session; visitors send the public key. */
export async function callBackoffice<T>(body: unknown): Promise<T> {
  const session = (await getSupabase()?.auth.getSession())?.data.session;
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/backoffice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${session?.access_token ?? anonKey}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new BackofficeError("We couldn't reach the back office. Check your connection.", 0);
  }
  const json = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !json) throw new BackofficeError(json?.error ?? "The back office isn't available yet.", response.status);
  return json;
}
