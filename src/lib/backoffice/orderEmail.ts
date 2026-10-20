// Order emails: a notice to the business (e.g. info@ and zuan@, so new orders
// show on a phone) and a confirmation to the customer. Pure; sent by the Edge
// Functions through Resend (supabase/functions/_shared/email.ts).
import type { BusinessSettings } from "./types";
import type { WebsiteOrder } from "./orders";

export type Email = { to: string[]; subject: string; html: string; text: string; replyTo?: string };

/** Where new-order notices go when Settings doesn't say otherwise. */
export const DEFAULT_ORDER_EMAILS = "info@octa-boost.com, zuan@octa-boost.com";
const ADMIN_URL = "https://octa-boost.com/admin/invoices/";

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
/** Test and documentation domains never receive mail. */
const deliverable = (email: string) => EMAIL.test(email) && !/\.(test|example|invalid|localhost)$/i.test(email) && !/@example\.(com|org|net)$/i.test(email);

export function orderRecipients(settings: Pick<BusinessSettings, "orderEmails">): string[] {
  const list = (settings.orderEmails?.trim() || DEFAULT_ORDER_EMAILS).split(/[\s,;]+/).map((e) => e.trim().toLowerCase());
  return [...new Set(list.filter(deliverable))].slice(0, 5);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (n: number) => `R${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;

type Totals = { subtotal: number; courier: number; total: number };
export type OrderStatus = "awaiting" | "paid";

function itemLines(o: WebsiteOrder) {
  return o.items.map((i) => ({ text: `${i.qty} × ${i.name} ${i.size}`, amount: money(i.price * i.qty) }));
}

function table(rows: [string, string][]) {
  return `<table cellpadding="6" style="border-collapse:collapse;font:14px Arial,sans-serif">${rows.map(([k, v]) =>
    `<tr><td style="color:#555;vertical-align:top">${esc(k)}</td><td style="font-weight:bold">${esc(v)}</td></tr>`).join("")}</table>`;
}

function wrap(title: string, body: string) {
  return `<div style="font:14px Arial,sans-serif;color:#191817;max-width:560px">
<div style="background:#191817;color:#c6f24e;padding:14px 18px;font-weight:bold;letter-spacing:1px">OCTA PERFORMANCE</div>
<div style="padding:18px;border:2px solid #191817;border-top:0"><h2 style="margin:0 0 12px">${esc(title)}</h2>${body}</div></div>`;
}

/** The notice to the business and the customer's confirmation for one order. */
export function orderEmails(o: WebsiteOrder, totals: Totals, invoice: string | null, settings: BusinessSettings, status: OrderStatus): { business: Email | null; customer: Email | null } {
  const c = o.customer;
  const method = o.method === "ozow" ? "Ozow" : "EFT";
  const state = status === "paid" ? `Paid by ${method}` : `${method}, awaiting payment`;
  const items = itemLines(o);
  const deliver = `${c.address}, ${c.city} ${c.postcode}`.trim();
  const summary: [string, string][] = [
    ...items.map((i): [string, string] => [i.text, i.amount]),
    ["Courier", totals.courier > 0 ? money(totals.courier) : "Free"],
    ["Total", money(totals.total)],
  ];

  const to = orderRecipients(settings);
  const business: Email | null = to.length ? {
    to,
    subject: `${status === "paid" ? "Paid" : "New"} website order ${o.ref} · ${money(totals.total)} · ${state}`,
    replyTo: deliverable(c.email) ? c.email : undefined,
    text: [
      `${status === "paid" ? "Payment received for" : "New"} website order ${o.ref} (${state}).`,
      invoice ? `Invoice: ${invoice}` : "",
      "",
      `Customer: ${c.name}${c.company ? `, ${c.company}` : ""}`, `Email: ${c.email}`, `Phone: ${c.phone}`, `Deliver to: ${deliver}`,
      "",
      ...summary.map(([k, v]) => `${k}: ${v}`),
      "",
      `Open the back office: ${ADMIN_URL}`,
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n"),
    html: wrap(`${status === "paid" ? "Paid" : "New"} website order ${o.ref}`,
      `<p><strong>${esc(state)}</strong>${invoice ? ` · Invoice ${esc(invoice)}` : ""}</p>`
      + table([["Customer", `${c.name}${c.company ? `, ${c.company}` : ""}`], ["Email", c.email], ["Phone", c.phone], ["Deliver to", deliver]])
      + `<hr style="border:0;border-top:1px solid #ddd">` + table(summary)
      + `<p><a href="${ADMIN_URL}" style="display:inline-block;background:#191817;color:#fff;padding:10px 14px;text-decoration:none">Open the back office</a></p>`),
  } : null;

  const b = settings.bank;
  const pay = status === "awaiting" && o.method === "eft";
  const customer: Email | null = deliverable(c.email) ? {
    to: [c.email],
    subject: status === "paid" ? `Payment received: OCTA order ${o.ref}` : `Your OCTA order ${o.ref}`,
    replyTo: settings.email || undefined,
    text: [
      `Hi ${c.name.split(" ")[0] || "there"},`, "",
      status === "paid" ? `Thank you, we've received your payment for order ${o.ref}.` : `Thank you for your order ${o.ref}.`,
      "",
      ...summary.map(([k, v]) => `${k}: ${v}`),
      ...(pay ? ["", "Please pay by EFT:", `Account holder: ${b.holder}`, `Bank: ${b.bank}`, `Account number: ${b.account}`, `Branch code: ${b.branch}`,
        `Account type: ${b.type}`, `Reference: ${o.ref}`, `Amount: ${money(totals.total)}`, "", "We dispatch once the payment reflects. Reply to this email with your proof of payment."] : []),
      "", `Delivery to: ${deliver}`, "", `${settings.tradingAs || "OCTA Performance"} · ${settings.phone || ""} · ${settings.email || ""}`,
    ].join("\n"),
    html: wrap(status === "paid" ? "Payment received" : "Thank you for your order",
      `<p>Order reference: <strong>${esc(o.ref)}</strong></p>` + table(summary)
      + (pay ? `<h3>Pay by EFT</h3>` + table([["Account holder", b.holder], ["Bank", b.bank], ["Account number", b.account], ["Branch code", b.branch],
        ["Account type", b.type], ["Reference", o.ref], ["Amount", money(totals.total)]])
        + `<p>We dispatch once the payment reflects. Reply to this email with your proof of payment.</p>` : "")
      + `<p style="color:#555">Delivery to: ${esc(deliver)}</p><p style="color:#555">${esc(settings.tradingAs || "OCTA Performance")} · ${esc(settings.phone || "")} · ${esc(settings.email || "")}</p>`),
  } : null;
  return { business, customer };
}
