// GENERATED from src/lib/backoffice/scope.ts by scripts/gen-backoffice-function.mjs. Do not edit.
import type { BackofficeData } from "./types.ts";
import type { User } from "./roles.ts";

/** Demo presentation rules. Real authorisation must be enforced by database RLS. */
export function scopeBackoffice(data: BackofficeData, user: User | null): BackofficeData | null {
  if (!user) return null;
  if (user.role === "main") return data;
  const clients = user.role === "rep" ? data.clients.filter(c => c.repId === user.repId) : data.clients;
  const ids = new Set(clients.map(c => c.id));
  return {
    ...data,
    // Order takers (Danium, reps) need each client's agreed prices to price orders; Accounts does not.
    clients: clients.map(c => ({ ...c, notes: "", prices: user.role === "accounts" ? {} : c.prices, linkedEmail: "" })),
    documents: data.documents.filter(d => ids.has(d.clientId) && (user.role !== "viewer" && user.role !== "accounts" || d.kind === "invoice"))
      .map(d => ({ ...d, lines: d.lines.map(l => ({ ...l, unitCost: 0 })) })),
    catalogue: data.catalogue.map(i => ({ ...i, cost: null, ...(user.role === "accounts" ? { agent: null, bulk: null } : {}) })),
    suppliers: user.role === "accounts" ? data.suppliers : [],
    supplierInvoices: user.role === "accounts" ? data.supplierInvoices : [],
    bank: user.role === "accounts" ? data.bank : [],
    reps: user.role === "rep" ? data.reps.filter(r => r.id === user.repId) : user.role === "accounts" ? data.reps : [],
    stock: user.role === "accounts" ? data.stock : data.stock.map(b => ({ ...b, unitCostEx: 0, unitCostIncl: 0, supplierId: null, supplierInvoiceId: null })),
    stockCounts: user.role === "accounts" ? data.stockCounts : [],
    referrals: user.role === "rep" ? data.referrals.filter(r => r.repId === user.repId) : user.role === "accounts" ? data.referrals : [],
  };
}
