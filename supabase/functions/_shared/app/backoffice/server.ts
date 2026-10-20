// GENERATED from src/lib/backoffice/server.ts by scripts/gen-backoffice-function.mjs. Do not edit.
// The live back office's server side, run by the Supabase Edge Function in
// supabase/functions/backoffice (a generated copy; see
// scripts/gen-backoffice-function.mjs). It verifies who is asking, loads the
// records, runs the same actions as the admin screens (actions.ts) and saves
// the changes in one versioned commit. Browsers only ever receive the records
// their role may see (scope.ts). Pure apart from the injected store, so it is
// tested in Node (scripts/backoffice-live.test.mjs).
import { ACTION_NAMES, ActionError, runAction, type ActionName, type Env } from "./actions.ts";
import { priceFor } from "./calc.ts";
import { accountEmails } from "./customerForm.ts";
import type { Role, User } from "./roles.ts";
import { scopeBackoffice } from "./scope.ts";
import { isSoldOut, stockLevels } from "./stock.ts";
import { customerClient, orderingOpen, recordWebsiteOrder, shopCatalogue, type ShopCatalogue, type WebsiteOrder } from "./orders.ts";
import { orderEmails, type Email } from "./orderEmail.ts";
import type { BackofficeData, CatalogueItem, Client } from "./types.ts";

/** One stored record per row: collection + id. Settings are a single row. */
export const COLLECTIONS = ["settings", "catalogue", "clients", "documents", "suppliers", "supplierInvoices", "bank", "reps", "stock", "stockCounts", "referrals"] as const;
export type Collection = (typeof COLLECTIONS)[number] | "file";
type ListCollection = Exclude<(typeof COLLECTIONS)[number], "settings">;

export type Row = { collection: Collection; id: string; data: unknown };
export type Loaded = { version: number; rows: Partial<Record<Collection, unknown[]>> };
export type StaffRow = { display_name: string; role: Role; active: boolean };

/** Database access, provided by the Edge Function (service role) or a test double. */
export interface Store {
  load(collections?: Collection[]): Promise<Loaded>;
  /** Saves only if nothing else committed since `version`; returns false on a clash. */
  commit(version: number, upserts: Row[], deletes: Omit<Row, "data">[], audit: { actor: string | null; operation: string; details: unknown }): Promise<boolean>;
  staff(userId: string): Promise<StaffRow | null>;
  /** First sign-in of an invited staff email (verified): becomes a staff row. */
  claimInvite(userId: string, email: string): Promise<StaffRow | null>;
  file(id: string): Promise<{ name: string; type: string; dataUrl: string } | null>;
  /** Website orders: the customer-facing order row (public.orders). Returns an error message, or null when saved (or already saved). */
  insertOrder?(row: Record<string, unknown>): Promise<string | null>;
  /** Staff logins (main admins only): everyone with a staff row, with their sign-in email. */
  listStaff?(): Promise<StaffLogin[]>;
  saveStaff?(userId: string, name: string, role: Exclude<Role, "rep">, active: boolean): Promise<void>;
  /** Create a confirmed login with this password, or confirm an existing one and set its password. */
  ensureLogin?(email: string, password: string): Promise<{ id: string } | { error: string }>;
}

export type StaffLogin = { user_id: string; display_name: string; role: Role; active: boolean; email: string | null };
const STAFF_ROLES = ["main", "viewer", "accounts", "rep"] as const;

/**
 * Change the back-office records outside a staff action (website orders,
 * confirmed online payments), with the same versioned commit and retries.
 */
export async function updateBackoffice<T>(store: Store, operation: string, mutate: (d: BackofficeData, env: Env) => T, today: string, makeId: (prefix: string) => string): Promise<{ ok: true; result: T } | { ok: false; reason: "not-set-up" | "busy" }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const loaded = await store.load();
    const before = toData(loaded);
    if (!before) return { ok: false, reason: "not-set-up" };
    const after = structuredClone(before);
    const result = mutate(after, { today, uid: makeId });
    const { upserts, deletes } = diff(before, after);
    if (!upserts.length && !deletes.length) return { ok: true, result };
    if (await store.commit(loaded.version, upserts, deletes, { actor: null, operation, details: { rows: upserts.length + deletes.length } })) return { ok: true, result };
  }
  return { ok: false, reason: "busy" };
}

/** Payment rules from supabase/functions/_shared/payment.ts, passed in by the Edge Function. */
export type OrderTools = {
  quote(items: unknown, catalogue: ShopCatalogue, city: unknown): { items: { sku: string; slug: string; name: string; size: string; price: number; qty: number }[]; subtotal: number; courier: number; total: number };
  validateCustomer(input: unknown): WebsiteOrder["customer"];
  /** False when this caller has placed too many orders recently. */
  allowed?(): Promise<boolean>;
  /** Bot check, when configured. */
  human?(token: unknown): Promise<boolean>;
  /** Send emails (order notice to the business, confirmation to the customer); failures never affect the order. */
  send?(emails: Email[]): Promise<void>;
};

/**
 * Place a website EFT order. Prices, courier and stock come from the live back
 * office (the customer's own prices when signed in); the browser's total must
 * match. The order is saved for the customer's history and as an unpaid
 * website invoice in the back office. Retries with the same reference are safe.
 */
export async function placeOrder(body: unknown, user: AuthUser | null, store: Store, today: string, makeId: (prefix: string) => string, tools: OrderTools): Promise<Reply> {
  const req = (body ?? {}) as Record<string, unknown>;
  try {
    if (typeof req.ref !== "string" || !/^OCTA-[A-F0-9]{12}$/.test(req.ref)) return { status: 400, body: { error: "Your order reference is invalid. Please reload checkout." } };
    if (req.termsAccepted !== true || typeof req.termsVersion !== "string") return { status: 400, body: { error: "Please read and agree to the terms before placing your order." } };
    if (tools.human && !await tools.human(req.captchaToken)) return { status: 400, body: { error: "Please complete the security check and try again." } };
    if (tools.allowed && !await tools.allowed()) return { status: 429, body: { error: "Too many orders from this connection. Please wait a few minutes." } };
    if (!store.insertOrder) return { status: 503, body: { error: "Ordering is unavailable. Please try again later." } };
    const customer = tools.validateCustomer(req.customer);
    const data = toData(await store.load());
    if (!orderingOpen(data)) return { status: 503, body: { error: "Online ordering isn't open yet. Please contact us to order." } };
    const client = user?.emailConfirmed ? customerClient(data!, user.email) : null;
    const quote = tools.quote(req.items, shopCatalogue(data!, client, today), customer.city);
    if (typeof req.expectedTotal !== "number" || Math.round(req.expectedTotal * 100) !== Math.round(quote.total * 100)) {
      return { status: 409, body: { error: "Prices or delivery have changed since your cart was made. Refresh the page and check your order before placing it." } };
    }
    const saved = await store.insertOrder({
      ref: req.ref, user_id: user?.id ?? null, customer, items: quote.items, subtotal: quote.subtotal, courier: quote.courier, total: quote.total,
      payment_method: "eft", terms_version: req.termsVersion,
    });
    if (saved) return { status: 400, body: { error: saved } };
    const order: WebsiteOrder = {
      ref: req.ref, method: "eft", customer, courier: quote.courier,
      items: quote.items.map(({ sku, name, size, price, qty }) => ({ sku, name, size, price, qty })),
      orderAs: req.orderAs === "company" ? "company" : "personal", saveCustomer: req.saveCustomer === true,
      registration: typeof req.registration === "string" ? req.registration.slice(0, 40) : "",
      profile: req.profile && typeof req.profile === "object" && JSON.stringify(req.profile).length < 50000 ? req.profile as WebsiteOrder["profile"] : undefined,
    };
    const recorded = await updateBackoffice(store, "website-order", (d, env) => {
      const isNew = !d.documents.some((x) => x.kind === "invoice" && x.reference === order.ref);
      return { number: recordWebsiteOrder(d, order, env), isNew };
    }, today, makeId);
    // Emails go out once, for the first successful placement (a retry sends nothing).
    if (tools.send && recorded.ok && recorded.result.isNew) {
      const mail = orderEmails(order, quote, recorded.result.number, data!.settings, "awaiting");
      await tools.send([mail.business, mail.customer].filter((m): m is Email => m !== null)).catch(() => undefined);
    }
    return { status: 200, body: {
      order: { ref: req.ref, items: quote.items, subtotal: quote.subtotal, courier: quote.courier, total: quote.total, name: customer.name, email: customer.email, placedAt: new Date().toISOString(), paymentMethod: "eft" },
      invoice: recorded.ok ? recorded.result.number : null,
    } };
  } catch (error) {
    const status = (error as { status?: unknown })?.status;
    if (error instanceof Error && typeof status === "number") return { status, body: { error: error.message } };
    return { status: 503, body: { error: "We couldn't place your order. Your cart has been kept. Please try again." } };
  }
}

export type AuthUser = { id: string; email: string | null; emailConfirmed: boolean };
export type Reply = { status: number; body: unknown };

const keyOf = (collection: Collection, item: Record<string, unknown>) => String(collection === "catalogue" ? item.sku : item.id);
const LISTS = COLLECTIONS.filter((c): c is ListCollection => c !== "settings");
const FILE_LIMIT = 7_000_000;

export function toData(loaded: Loaded): BackofficeData | null {
  const settings = loaded.rows.settings?.[0] as BackofficeData["settings"] | undefined;
  if (!settings) return null;
  const data = { version: 1, settings } as BackofficeData;
  for (const c of LISTS) (data as Record<string, unknown>)[c] = loaded.rows[c] ?? [];
  return data;
}

function toRows(d: BackofficeData): Map<string, Row> {
  const rows = new Map<string, Row>();
  rows.set("settings\u0000main", { collection: "settings", id: "main", data: { ...d.settings, id: "main" } });
  for (const c of LISTS) for (const item of d[c] as unknown as Record<string, unknown>[]) {
    const id = keyOf(c, item);
    rows.set(`${c}\u0000${id}`, { collection: c, id, data: item });
  }
  return rows;
}

/** What changed between two copies of the records. */
export function diff(before: BackofficeData | null, after: BackofficeData): { upserts: Row[]; deletes: Omit<Row, "data">[] } {
  const a = before ? toRows(before) : new Map<string, Row>();
  const b = toRows(after);
  const upserts: Row[] = [];
  for (const [key, row] of b) if (!a.has(key) || JSON.stringify(a.get(key)!.data) !== JSON.stringify(row.data)) upserts.push(row);
  const deletes = [...a].filter(([key]) => !b.has(key)).map(([, { collection, id }]) => ({ collection, id }));
  return { upserts, deletes };
}

/** Supplier invoice files are kept out of the everyday records and fetched when opened. */
function moveFiles(d: BackofficeData, upserts: Row[]): Row[] {
  const files: Row[] = [];
  for (const inv of d.supplierInvoices) {
    const a = inv.attachment;
    if (!a?.dataUrl) continue;
    if (a.dataUrl.length > FILE_LIMIT || !/^data:[\w.+/-]+;base64,/.test(a.dataUrl)) throw new ActionError("Attach a PDF or photo under 5 MB.");
    files.push({ collection: "file", id: inv.id, data: { name: a.name, type: a.type, dataUrl: a.dataUrl } });
    inv.attachment = { ...a, dataUrl: null, stored: true };
  }
  for (const f of files) {
    const row = upserts.find((r) => r.collection === "supplierInvoices" && r.id === f.id);
    if (row) row.data = d.supplierInvoices.find((x) => x.id === f.id);
  }
  return files;
}

/** Staff role for a verified user: a staff row, a claimed invite, or an active rep's email. */
async function whoIs(user: AuthUser, store: Store, data: BackofficeData | null): Promise<User | null> {
  const base = { id: user.id, email: user.email ?? "", demoEmail: "" };
  let staff = await store.staff(user.id);
  if (!staff && user.email && user.emailConfirmed) staff = await store.claimInvite(user.id, user.email.toLowerCase());
  if (staff && staff.role !== "rep") return staff.active ? { ...base, name: staff.display_name, role: staff.role } : null;
  if (staff && !staff.active) return null;
  const email = user.email?.toLowerCase();
  const rep = email && user.emailConfirmed ? data?.reps.find((r) => r.active && r.email.toLowerCase() === email) : undefined;
  return rep ? { ...base, name: rep.name, role: "rep", repId: rep.id } : null;
}

/** What a browser may receive back from an action. */
function scopedResult(result: unknown, scoped: BackofficeData): unknown {
  if (!result || typeof result !== "object") return result ?? null;
  const r = result as { id?: string; lines?: unknown; type?: unknown };
  if (r.lines) return scoped.documents.find((x) => x.id === r.id) ?? null;
  if (r.type && "tier" in r) return scoped.clients.find((x) => x.id === r.id) ?? null;
  return result;
}

/** Ids made by the browser for its own copy, reused so both sides agree (e.g. a converted invoice's id). */
function envFor(today: string, ids: unknown, fallback: (prefix: string) => string): Env {
  const queue = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && /^[a-z]{1,3}-[0-9a-f]{8}$/.test(x)).slice(0, 2000) : [];
  return { today, uid: (prefix) => { const i = queue.findIndex((x) => x.startsWith(`${prefix}-`)); return i >= 0 ? queue.splice(i, 1)[0] : fallback(prefix); } };
}

/** The shop's view: public catalogue fields, the courier fee and the signed-in customer's own prices. */
function publicView(data: BackofficeData | null, user: AuthUser | null, today: string) {
  if (!data) return { ready: false };
  const levels = data.catalogue.some((i) => i.stock === "auto") ? stockLevels(data, today) : [];
  const catalogue: CatalogueItem[] = data.catalogue.map((i) => ({
    ...i, cost: null, agent: null, bulk: null, soldOut: isSoldOut(i, levels),
    costing: i.costing ? { purityEnabled: i.costing.purityEnabled, purity: i.costing.purity, litres: null, lines: [], useAsCost: false } : undefined,
  }));
  const email = user?.emailConfirmed ? user.email?.toLowerCase() : null;
  const found = email ? data.clients.find((c) => accountEmails(c).includes(email)) : undefined;
  const client: Client | null = found ? {
    id: found.id, type: found.type, name: found.name, company: found.company, email: "", phone: "", vat: "", address: "", city: "", notes: "",
    tier: found.tier, linkedEmail: "", createdAt: "",
    prices: Object.fromEntries(data.catalogue.flatMap((i) => { const p = priceFor(i, found); return p ? [[i.sku, p]] : []; })),
  } : null;
  return { ready: true, catalogue, courierFee: data.settings.courierFee ?? null, client, orderingOpen: orderingOpen(data) };
}

function validStart(d: unknown): d is BackofficeData {
  const x = d as BackofficeData;
  return !!x && typeof x === "object" && x.version === 1 && !!x.settings && typeof x.settings === "object"
    && LISTS.every((c) => Array.isArray(x[c])) && x.catalogue.length > 0 && x.documents.length === 0;
}

export async function handle(body: unknown, user: AuthUser | null, store: Store, today: string, makeId: (prefix: string) => string): Promise<Reply> {
  const req = (body ?? {}) as { op?: string; name?: string; args?: unknown; ids?: unknown; data?: unknown; invoiceId?: unknown };
  try {
    if (req.op === "public") {
      let loaded = await store.load(user ? ["settings", "catalogue", "clients", "reps"] : ["settings", "catalogue"]);
      // Automatic stock status needs the stock records and invoices too.
      if ((loaded.rows.catalogue as CatalogueItem[] | undefined)?.some((i) => i.stock === "auto")) {
        const more = await store.load(["stock", "stockCounts", "documents"]);
        loaded = { version: loaded.version, rows: { ...loaded.rows, ...more.rows } };
      }
      const data = toData(loaded);
      // Staff see a "Back office" button on the website.
      const staff = user ? !!await whoIs(user, store, data) : false;
      return { status: 200, body: { ...publicView(data, user, today), staff } };
    }
    if (!user) return { status: 401, body: { error: "Sign in to use the back office." } };

    if (req.op === "load" || req.op === "init") {
      const loaded = await store.load();
      let data = toData(loaded);
      const admin = await whoIs(user, store, data);
      if (!admin) return { status: 403, body: { error: "This account isn't set up for the back office." } };
      if (req.op === "init") {
        if (admin.role !== "main") return { status: 403, body: { error: "A main admin sets up the back office." } };
        if (data) return { status: 409, body: { error: "The back office is already set up." } };
        if (!validStart(req.data)) return { status: 400, body: { error: "The starting records aren't valid." } };
        const start = req.data;
        const { upserts } = diff(null, start);
        if (!await store.commit(loaded.version, upserts, [], { actor: user.id, operation: "init", details: { rows: upserts.length } })) return { status: 409, body: { error: "Someone else is setting up the back office. Reload." } };
        data = start;
      }
      return { status: 200, body: { admin, data: data ? scopeBackoffice(data, admin) : null, needsSetup: !data } };
    }

    // Staff logins, created by a main admin on the website: no confirmation email needed.
    if (req.op === "staff" || req.op === "createLogin" || req.op === "setStaffActive") {
      const admin = await whoIs(user, store, toData(await store.load(["settings", "reps"])));
      if (admin?.role !== "main") return { status: 403, body: { error: "Only main admins manage staff logins." } };
      if (!store.listStaff || !store.saveStaff || !store.ensureLogin) return { status: 503, body: { error: "Staff logins are unavailable." } };
      const r = req as Record<string, unknown>;
      if (req.op === "createLogin") {
        const email = typeof r.email === "string" ? r.email.trim().toLowerCase() : "";
        const name = typeof r.name === "string" ? r.name.trim().slice(0, 200) : "";
        const role = STAFF_ROLES.find((x) => x === r.role);
        const password = typeof r.password === "string" ? r.password : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { status: 400, body: { error: "Enter a valid email address." } };
        if (!name) return { status: 400, body: { error: "Enter the person's name." } };
        if (!role) return { status: 400, body: { error: "Choose a role." } };
        if (password.length < 12 || password.length > 128) return { status: 400, body: { error: "Use a temporary password of at least 12 characters." } };
        if (role === "rep") {
          const reps = toData(await store.load(["settings", "reps"]))?.reps ?? [];
          if (!reps.some((x) => x.active && x.email.toLowerCase() === email)) return { status: 400, body: { error: "Add the rep under Sales reps first (with this email), then create their login." } };
        }
        // A main admin stays a main admin: their login can't be given a smaller role.
        const current = (await store.listStaff()).find((x) => x.email?.toLowerCase() === email);
        if (current?.role === "main" && role !== "main") return { status: 400, body: { error: `${current.display_name} is a main admin, and main admins can't be changed to another role.` } };
        const login = await store.ensureLogin(email, password);
        if ("error" in login) return { status: 400, body: { error: login.error } };
        // Reps get their access from the Sales reps list; everyone else from a staff row.
        if (role !== "rep") await store.saveStaff(login.id, name, role, true);
      }
      if (req.op === "setStaffActive") {
        const target = (await store.listStaff()).find((x) => x.user_id === r.userId);
        if (!target || target.role === "rep") return { status: 404, body: { error: "That login isn't on the staff list." } };
        // Main admins can't be switched off, by anyone.
        if (target.role === "main" && r.active !== true) return { status: 400, body: { error: "Main admins can't be switched off." } };
        await store.saveStaff(target.user_id, target.display_name, target.role as Exclude<Role, "rep">, r.active === true);
      }
      return { status: 200, body: { staff: await store.listStaff() } };
    }

    if (req.op === "file") {
      const admin = await whoIs(user, store, toData(await store.load(["reps"])) ?? null);
      if (admin?.role !== "main" && admin?.role !== "accounts") return { status: 403, body: { error: "This isn't part of your access." } };
      const file = typeof req.invoiceId === "string" ? await store.file(req.invoiceId) : null;
      return file ? { status: 200, body: file } : { status: 404, body: { error: "That file isn't stored." } };
    }

    if (req.op === "act") {
      const name = req.name as ActionName;
      if (!(ACTION_NAMES as readonly string[]).includes(name) || !Array.isArray(req.args)) return { status: 400, body: { error: "Unknown back-office action." } };
      // Optimistic concurrency: if someone else saved in between, start again from their version.
      for (let attempt = 0; attempt < 5; attempt++) {
        const loaded = await store.load();
        const before = toData(loaded);
        if (!before) return { status: 409, body: { error: "The back office isn't set up yet. A main admin signs in first." } };
        const admin = await whoIs(user, store, before);
        if (!admin) return { status: 403, body: { error: "This account isn't set up for the back office." } };
        const after = structuredClone(before);
        const result = runAction(after, admin, name, structuredClone(req.args) as never, envFor(today, req.ids, makeId));
        const { upserts, deletes } = diff(before, after);
        const files = moveFiles(after, upserts);
        const removedFiles = deletes.filter((r) => r.collection === "supplierInvoices").map((r) => ({ collection: "file" as const, id: r.id }));
        const ok = !upserts.length && !deletes.length ? true
          : await store.commit(loaded.version, [...upserts, ...files], [...deletes, ...removedFiles], { actor: user.id, operation: name, details: { by: admin.name, rows: upserts.length + deletes.length } });
        if (!ok) continue;
        const scoped = scopeBackoffice(after, admin)!;
        return { status: 200, body: { data: scoped, result: scopedResult(result, scoped) } };
      }
      return { status: 409, body: { error: "Others are saving at the same moment. Try again." } };
    }
    return { status: 400, body: { error: "Unknown request." } };
  } catch (error) {
    if (error instanceof ActionError) return { status: 400, body: { error: error.message } };
    return { status: 500, body: { error: "The back office couldn't save that. Try again." } };
  }
}
