// Supabase handles customer accounts (email + password, password reset emails)
// and stores profiles and orders. The site is a static export, so everything
// runs in the browser with the project's public anon key; row-level security
// in supabase/schema.sql keeps each customer to their own data.
//
// Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at build time
// (see .env.example and the README). Without them the account pages render but
// explain that accounts are not connected yet, and order submission stays closed.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const accountsEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!accountsEnabled || typeof window === "undefined") return null;
  client ??= createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Picks up the session from email links (confirm sign-up, reset password).
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });
  return client;
}

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
};

export type OrderRow = {
  id: number;
  ref: string;
  items: { sku: string; slug: string; name: string; size: string; price: number; qty: number }[];
  subtotal: number;
  courier: number;
  total: number;
  status: string;
  created_at: string;
  payment_method?: "eft" | "ozow";
  payment_environment?: "staging" | "production" | null;
  payment_confirmed_at?: string | null;
  payment_confirmed_amount?: number | null;
  payment_reference?: string | null;
};
