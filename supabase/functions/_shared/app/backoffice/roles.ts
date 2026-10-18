// GENERATED from src/lib/backoffice/roles.ts by scripts/gen-backoffice-function.mjs. Do not edit.
// Who may do what in the back office. Pure, so the same rules drive the
// navigation, the pages and (mirrored in supabase/backoffice.sql) the database.

export type Role = "main" | "viewer" | "accounts" | "rep";

export type Area = "dashboard" | "invoices" | "quotes" | "clients" | "pricing" | "products" | "suppliers" | "bank" | "settings" | "reps";

export type Access = "edit" | "view" | null;

export type Staff = {
  id: string;
  name: string;
  role: Role;
  /** Live sign-in email (the business mailbox). */
  email: string;
  /** Demo sign-in email: public sample credentials, never a real account. */
  demoEmail: string;
};

/** The back office has exactly four admins. */
export const MAX_ADMINS = 4;

export const STAFF: Staff[] = [
  { id: "zuan", name: "Zuan", role: "main", email: "zuan@octa-boost.com", demoEmail: "zuan@example.test" },
  { id: "zandro", name: "Zandro", role: "main", email: "zandro@octa-boost.com", demoEmail: "zandro@example.test" },
  { id: "danium", name: "Danium", role: "viewer", email: "danium@octa-boost.com", demoEmail: "danium@example.test" },
  { id: "accounts", name: "Accounts", role: "accounts", email: "accounts@octa-boost.com", demoEmail: "accounts@example.test" },
];

/** A signed-in back-office user: one of the four admins, or a sales rep. */
export type User = Staff & { repId?: string };

export const ROLE_LABEL: Record<Role, string> = {
  rep: "Sales rep (own customers only)",
  main: "Main admin",
  viewer: "Invoices, customers and orders (no price changes)",
  accounts: "Accounts",
};

const ACCESS: Record<Role, Partial<Record<Area, Access>>> = {
  main: { dashboard: "edit", invoices: "edit", quotes: "edit", clients: "edit", pricing: "edit", products: "edit", suppliers: "edit", bank: "edit", settings: "edit", reps: "edit" },
  // Danium: sees invoices and customers, edits nothing.
  viewer: { invoices: "view", clients: "view" },
  // Accounts: supplier invoices, bank statements, customer invoices, statements and balances.
  // May record payments against invoices but not change invoices, prices or products.
  accounts: { suppliers: "edit", bank: "edit", invoices: "view", clients: "view", reps: "view" },
  // Reps: only the customers allocated to them, their invoices and quotes, and their own figures.
  // Reps also fill in their own details (ID, address, bank) on the Reps page.
  rep: { dashboard: "view", invoices: "view", quotes: "view", clients: "view", reps: "view" },
};

/** Main admins see cost and profit; nobody else does. */
export const canSeeProfit = (role: Role | undefined) => role === "main";

export function access(role: Role | undefined, area: Area): Access {
  return role ? ACCESS[role][area] ?? null : null;
}

export const canView = (role: Role | undefined, area: Area) => access(role, area) !== null;
export const canEdit = (role: Role | undefined, area: Area) => access(role, area) === "edit";
/**
 * Taking orders: main admins, Danium and reps (for their own customers) can
 * create invoices for private and cash sales and sign off deliveries. Only
 * main admins change prices.
 */
export const canCreateOrders = (role: Role | undefined) => role === "main" || role === "viewer" || role === "rep";
export const canSignDelivery = canCreateOrders;
export const canChangePrices = (role: Role | undefined) => role === "main";

/** Recording a payment is bookkeeping: main admins and Accounts. */
export const canRecordPayments = (role: Role | undefined) => role === "main" || role === "accounts";

/** The back-office page a path belongs to. */
export function areaForPath(path: string): Area | null {
  const p = path.replace(/^.*?\/admin/, "/admin").replace(/\/+$/, "") + "/";
  if (p === "/admin/") return "dashboard";
  const map: [string, Area][] = [
    ["/admin/invoices/", "invoices"], ["/admin/quotes/", "quotes"], ["/admin/clients/", "clients"], ["/admin/client/", "clients"],
    ["/admin/products/", "products"], ["/admin/suppliers/", "suppliers"], ["/admin/bank/", "bank"], ["/admin/settings/", "settings"],
    ["/admin/document/", "invoices"], ["/admin/reps/", "reps"],
  ];
  return map.find(([prefix]) => p.startsWith(prefix))?.[1] ?? null;
}

/** First page this role may open, used after sign-in and when a page is off limits. */
export function homeFor(role: Role): string {
  if (canView(role, "dashboard")) return "/admin/";
  if (canView(role, "invoices")) return "/admin/invoices/";
  return "/admin/clients/";
}
