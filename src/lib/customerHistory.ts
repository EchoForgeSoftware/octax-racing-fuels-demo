import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderRow } from "./supabase";

export const HISTORY_PAGE_SIZE = 25;
export async function fetchCustomerOrders(client: SupabaseClient, userId: string, beforeId?: number) {
  if (!userId) throw new Error("Sign in to load your orders.");
  let query = client.from("orders")
    .select("id,ref,items,subtotal,courier,total,status,created_at,payment_method,payment_environment,payment_confirmed_at,payment_confirmed_amount,payment_reference")
    .eq("user_id", userId).order("id", { ascending: false });
  if (beforeId !== undefined) query = query.lt("id", beforeId);
  const { data, error } = await query.limit(HISTORY_PAGE_SIZE + 1);
  if (error) throw new Error("We couldn't load your history. Please try refreshing it.");
  const rows = (data ?? []) as OrderRow[];
  return { orders: rows.slice(0, HISTORY_PAGE_SIZE), hasMore: rows.length > HISTORY_PAGE_SIZE };
}

export function confirmedPayments(orders: OrderRow[]) {
  return orders.filter(order => order.payment_environment !== "staging" &&
    Boolean(order.payment_confirmed_at) && Number.isFinite(Number(order.payment_confirmed_amount)) &&
    Number(order.payment_confirmed_amount) > 0)
    .sort((a, b) => Date.parse(b.payment_confirmed_at!) - Date.parse(a.payment_confirmed_at!));
}

export function customerHistorySummary(orders: OrderRow[]) {
  const live = orders.filter(order => order.payment_environment !== "staging");
  const payments = confirmedPayments(orders);
  return { orders: live.length, payments: payments.length,
    paid: payments.reduce((sum, order) => sum + Number(order.payment_confirmed_amount), 0),
    awaiting: live.filter(order => order.status === "awaiting_payment" && !order.payment_confirmed_at).length };
}

export function paymentLabel(order: OrderRow) {
  if (order.payment_environment === "staging") return order.payment_confirmed_at ? "Test payment confirmed" : "Test payment";
  if (order.payment_confirmed_at) return "Payment confirmed";
  if (order.status === "paid") return "Marked paid · confirmation date not recorded";
  if (order.status === "awaiting_payment") return "Awaiting payment confirmation";
  return "No payment confirmation recorded";
}

export function paymentMethod(order: OrderRow) { return order.payment_method === "ozow" ? "Ozow" : "Manual EFT"; }
export function historyDate(value: string | null | undefined, time = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not recorded";
  return new Date(value).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) });
}
