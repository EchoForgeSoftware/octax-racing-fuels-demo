// Delivery options for an order, from the rules a main admin sets in
// back-office Settings → Delivery: local delivery to chosen towns (by our own
// vehicle), courier everywhere else, a minimum number of packs for delivery,
// and collection. The shop, checkout and the order server all use this, so
// what the customer sees is what they are charged. Self-contained apart from
// courierRates (it is copied into the Edge Functions).
import { courierRates, localTown, townsNear } from "./courierRates";

export type DeliveryMethod = "local" | "courier" | "collect";

/** Stored in the back-office settings (delivery). The collection address stays private there. */
export type DeliverySettings = {
  /** Base towns for our own delivery, e.g. Boksburg, Benoni, Brakpan. */
  localTowns: string[];
  /** We also deliver ourselves to towns within this many km of a base town. */
  localKm: number;
  /** Local delivery charge per order; null = the courier rates. */
  localFee: number | null;
  /** Fewest packs (any size) an order needs for delivery; smaller orders can only be collected. */
  minPacks: number;
  collection: { enabled: boolean; address: string; hours: string };
};

/** What the shop may know: no collection address. */
export type DeliveryRules = Omit<DeliverySettings, "collection"> & {
  courierFee: number; collection: { enabled: boolean; hours: string };
  /** Base towns plus every known town within localKm: where local delivery is offered. */
  localArea: string[];
};

export const DEFAULT_DELIVERY: DeliverySettings = {
  localTowns: ["boksburg", "benoni", "brakpan"],
  localKm: 20,
  localFee: null,
  minPacks: 3,
  collection: { enabled: false, address: "", hours: "" },
};

const clean = (towns: unknown): string[] =>
  (Array.isArray(towns) ? towns : []).map((t) => String(t).toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 40);

/** The rules from the back-office settings, with defaults for anything not set yet. */
export function deliveryRules(settings: { courierFee?: number; deliveryRules?: Partial<DeliverySettings> } | null | undefined): DeliveryRules {
  const d = { ...DEFAULT_DELIVERY, ...(settings?.deliveryRules ?? {}) };
  const fee = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null);
  const towns = clean(d.localTowns).length ? clean(d.localTowns) : DEFAULT_DELIVERY.localTowns;
  const radius = Math.max(0, Math.min(100, Math.round(Number(d.localKm ?? DEFAULT_DELIVERY.localKm) || 0)));
  return {
    localTowns: towns,
    localKm: radius,
    localArea: townsNear(towns, radius),
    localFee: fee(d.localFee),
    minPacks: Math.max(1, Math.min(100, Math.round(Number(d.minPacks) || 1))),
    courierFee: fee(settings?.courierFee) ?? courierRates.fee,
    collection: { enabled: d.collection?.enabled === true && !!d.collection.address?.trim(), hours: String(d.collection?.hours ?? "").slice(0, 200) },
  };
}

const litres = (size: string) => (/ml/i.test(size) ? parseFloat(size) / 1000 : parseFloat(size));
const FREE_FROM: Record<string, number> = courierRates.freeFrom;

/** Courier per the policy: a fee per pack, free from 10 (5 L / 25 L) or 12 (500 ml) of one product; drums always pay; other sizes quoted. */
export function courierCost(lines: { size: string; qty: number }[], feePerPack: number): { fee: number; quoted: boolean } {
  let cents = 0;
  let quoted = false;
  for (const l of lines) {
    if (/drum/i.test(l.size)) { cents += Math.round(feePerPack * 100) * l.qty; continue; }
    const threshold = FREE_FROM[String(litres(l.size))];
    if (!threshold) { quoted = true; continue; }
    if (l.qty < threshold) cents += Math.round(feePerPack * 100) * l.qty;
  }
  return { fee: cents / 100, quoted };
}

export type DeliveryOption = { method: DeliveryMethod; label: string; fee: number; available: boolean; reason?: string };

export const DELIVERY_NAME: Record<DeliveryMethod, string> = { local: "OCTA local delivery", courier: "Courier", collect: "Collect" };

/** The ways this order can reach the customer: collection first (free), then delivery as an add-on. */
export function deliveryOptions(lines: { size: string; qty: number }[], city: string | null | undefined, rules: DeliveryRules): DeliveryOption[] {
  const packs = lines.reduce((n, l) => n + l.qty, 0);
  const enough = packs >= rules.minPacks;
  const short = `Delivery is from ${rules.minPacks} packs${rules.collection.enabled ? "; you can collect smaller orders" : ""}.`;
  const town = localTown(city, rules.localArea);
  const courier = courierCost(lines, rules.courierFee);
  // Collection (free, at the collection point) comes first; delivery is the paid add-on.
  const options: DeliveryOption[] = rules.collection.enabled ? [{ method: "collect", label: "Collect (free)", fee: 0, available: true }] : [];
  if (town) {
    const fee = rules.localFee ?? courier.fee;
    const quoted = rules.localFee === null && courier.quoted;
    options.push({ method: "local", label: `${DELIVERY_NAME.local} (${town.replace(/\b\w/g, (c) => c.toUpperCase())})`, fee,
      available: enough && !quoted, ...(!enough ? { reason: short } : quoted ? { reason: "Some items need a delivery quote. Please contact us." } : {}) });
  } else {
    options.push({ method: "courier", label: DELIVERY_NAME.courier, fee: courier.fee, available: enough && !courier.quoted,
      ...(!enough ? { reason: short } : courier.quoted ? { reason: "Some items need a courier quote. Please contact us." } : {}) });
  }
  return options;
}

/** The customer's choice (or the first one available), checked against the rules. */
export function pickDelivery(lines: { size: string; qty: number }[], city: string | null | undefined, rules: DeliveryRules, wanted?: unknown):
  { ok: true; method: DeliveryMethod; fee: number; label: string } | { ok: false; reason: string } {
  const options = deliveryOptions(lines, city, rules);
  // A choice that isn't offered here (e.g. courier inside the local area) is refused, never swapped silently.
  if (wanted && !options.some((o) => o.method === wanted)) return { ok: false, reason: "That delivery option isn't available for this address. Please choose again." };
  const choice = options.find((o) => o.method === wanted) ?? options.find((o) => o.available);
  if (!choice) return { ok: false, reason: options[0]?.reason ?? "Delivery isn't available for this order. Please contact us." };
  if (!choice.available) return { ok: false, reason: choice.reason ?? "That delivery option isn't available for this order." };
  return { ok: true, method: choice.method, fee: choice.fee, label: choice.label };
}
