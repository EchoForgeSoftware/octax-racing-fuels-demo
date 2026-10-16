// Starting data for the back office. The catalogue comes from the website's
// own products; cost prices come from the supplied price list (incl. VAT, as
// paid by a non-VAT-registered business). Clients, quotes and invoices are
// clearly fictional sample records for the demo only (except the OCTA Sales
// login, which is the company's own sales@ account).
import { comingSoon, products } from "../products";
import { deliveryFor } from "../courier";
import { exVat, stockLevels } from "./stock";
import { BANK, SITE } from "../site";
import { addDays, cents, defaultsFor, formatNumber, priceFor, todaySA } from "./calc";
import type { BackofficeData, CatalogueCategory, CatalogueItem, Channel, Client, Document, DocLine, Payment, Rep, StockBatch, Supplier, SupplierInvoice } from "./types";

/** Illustrative demo unit costs; final costs and pack sizes need business confirmation. */
const COSTS: Record<string, number> = {
  "OCTA-X-25": 555.68,
  "OCTA-X-210": 5230.89,
  "OCTA-M-25": 477.94,
  "OCTA-M-210": 4414.62,
  "OCTA-BOOST-5": 229.94,
  "OCTA-SHOT-500": 97.97,
  "OCTA-TORQUE-500": 77.68,
};

const roundTo10 = (n: number) => Math.round(n / 10) * 10;

export function baseCatalogue(sampleTiers: boolean): CatalogueItem[] {
  const upcoming: CatalogueItem[] = comingSoon.flatMap((u) =>
    u.variants.map((v) => ({
      sku: v.sku, slug: null, productName: `${u.name} ${u.line}`, size: v.size, category: u.group,
      retail: null, agent: null, bulk: null, cost: null, short: u.description, description: u.description,
      active: true, custom: false, comingSoon: true,
    })),
  );
  return [...products.flatMap((p) =>
    p.variants.map((v) => ({
      sku: v.sku,
      slug: p.slug,
      productName: p.name,
      size: v.size,
      category: p.category as CatalogueCategory,
      retail: v.price,
      // Agent and bulk lists are the business's call; the demo shows illustrative discounts.
      agent: sampleTiers && v.price ? roundTo10(v.price * 0.9) : null,
      bulk: sampleTiers && v.price ? roundTo10(v.price * 0.85) : null,
      cost: COSTS[v.sku] ?? null,
      short: p.short,
      description: p.description,
      active: true,
      custom: false,
      comingSoon: false,
    })),
  ), ...upcoming];
}

export function defaultSettings(): BackofficeData["settings"] {
  return {
    businessName: SITE.legalName,
    tradingAs: SITE.name,
    registration: SITE.registrationNumber,
    vatRegistered: false,
    vatNumber: "",
    address: SITE.businessAddress,
    email: SITE.accountsEmail,
    phone: SITE.phoneDisplay,
    bank: { holder: BANK.accountHolder, bank: BANK.bank, account: BANK.accountNumber, branch: BANK.branchCode, type: BANK.accountType },
    paymentTermsDays: 7,
    quoteValidDays: 14,
    invoiceFooter: "Thank you for your business. Fuel the addiction.",
    next: { quote: 1, invoice: 1 },
  };
}

/** Sample rep allocation. */
const SAMPLE_REP_OF: Record<string, string> = { "c-rand": "r-sipho", "c-highveld": "r-sipho", "c-coastal": "r-marco", "c-pieter": "r-marco" };

/** Small deterministic generator so every demo starts with the same records. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SAMPLE_CLIENTS: Omit<Client, "createdAt" | "prices" | "tier" | "linkedEmail">[] = [
  { id: "c-rand", type: "agent", name: "Johan Steyn", company: "Rand Racing Supplies (sample)", email: "orders@randracing.example.test", phone: "+27 11 000 0001", vat: "", address: "12 Example Road", city: "Boksburg", notes: "Sample agent: East Rand workshops and drag strip." },
  { id: "c-coastal", type: "agent", name: "Kyle Naidoo", company: "Coastal Motorsport Agency (sample)", email: "kyle@coastal.example.test", phone: "+27 31 000 0002", vat: "4000000002", address: "8 Sample Street", city: "Durban", notes: "Sample agent: KZN circuit racers." },
  { id: "c-highveld", type: "bulk", name: "Marike Botha", company: "Highveld Drag Club (sample)", email: "fuel@highvelddrag.example.test", phone: "+27 12 000 0003", vat: "", address: "Club House, Example Raceway", city: "Pretoria", notes: "Sample bulk buyer: methanol drums for race days." },
  { id: "c-cash", type: "private", name: "Cash sales", company: "", email: "", phone: "", vat: "", address: "", city: "", notes: "Walk-in and cash sales not tied to a named client." },
  { id: "c-pieter", type: "private", name: "Pieter van Wyk (sample)", company: "", email: "pieter@example.test", phone: "+27 82 000 0005", vat: "", address: "", city: "Centurion", notes: "" },
  { id: "c-alex", type: "website", name: "Alex Demo", company: "Demo Racing Team", email: "customer@example.test", phone: "", vat: "", address: "Example workshop — sample address", city: "Pretoria", notes: "Linked to the demo customer login: signs in and sees agreed prices." },
  { id: "c-thandi", type: "website", name: "Thandi Mokoena (sample)", company: "", email: "thandi@example.test", phone: "+27 72 000 0007", vat: "", address: "", city: "Johannesburg", notes: "" },
];

export function demoData(today: string): BackofficeData {
  const settings = defaultSettings();
  const catalogue = baseCatalogue(true);
  const created = addDays(today, -200);
  const clients: Client[] = SAMPLE_CLIENTS.map((c) => ({
    ...c,
    tier: defaultsFor(c.type).tier,
    prices: (c.id === "c-alex" ? { "OCTA-X-25": 720, "OCTA-BOOST-5": 410 } : c.id === "c-highveld" ? { "OCTA-M-210": 4950 } : {}) as Record<string, number>,
    linkedEmail: c.id === "c-alex" ? "customer@example.test" : "",
    createdAt: created,
    repId: SAMPLE_REP_OF[c.id] ?? null,
    cash: c.id === "c-cash",
  }));
  const reps: Rep[] = [
    { id: "r-sipho", name: "Sipho (sample rep)", email: "rep@example.test", phone: "", active: true, createdAt: created,
      idNumber: "", address: "", bank: { holder: "", bank: "", account: "", branch: "", type: "" } },
    { id: "r-marco", name: "Marco (sample rep)", email: "marco@example.test", phone: "", active: true, createdAt: created },
  ];
  const cashNames = ["J. Pretorius", "Walk-in: Kobus", "T. Dlamini", "R. Naidoo", "Walk-in: Andre"];
  let cashCount = 0;

  const random = rng(20261016);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const sellable = catalogue.filter((i) => i.retail !== null);
  const documents: Document[] = [];
  let lineId = 0;

  function lines(client: Client, count: number, drums: boolean): DocLine[] {
    const pool = sellable.filter((i) => drums || !/drum/i.test(i.size));
    const chosen = new Map<string, DocLine>();
    for (let i = 0; i < count; i++) {
      const item = pick(pool);
      const qty = /drum/i.test(item.size) ? 1 + Math.floor(random() * 2) : 1 + Math.floor(random() * (client.type === "bulk" || client.type === "agent" ? 12 : 4));
      if (chosen.has(item.sku)) continue;
      chosen.set(item.sku, {
        id: `l${++lineId}`,
        sku: item.sku,
        description: `${item.productName} — ${item.size}`,
        qty,
        unitPrice: priceFor(item, client) ?? 0,
        unitCost: item.cost ?? 0,
      });
    }
    return [...chosen.values()];
  }

  function courierFor(docLines: DocLine[]): number {
    // Same rule as the website: R200 per pack, free from 10 (5L/25L) or 12 (500ml); drums always pay.
    return cents(docLines.reduce((n, l) => {
      const drum = /drum/i.test(l.description);
      const free = /500ml/i.test(l.description) ? l.qty >= 12 : l.qty >= 10;
      return n + (drum || !free ? 200 * l.qty : 0);
    }, 0));
  }

  const plan: { client: string; daysAgo: number; settle: "paid" | "part" | "unpaid"; count: number }[] = [];
  const schedule = ["c-rand", "c-alex", "c-cash", "c-highveld", "c-coastal", "c-thandi", "c-pieter", "c-rand", "c-cash", "c-alex", "c-coastal", "c-highveld"];
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor((i / 30) * 175) + Math.floor(random() * 5);
    plan.push({ client: schedule[i % schedule.length], daysAgo, settle: daysAgo < 6 ? "unpaid" : daysAgo < 12 && i % 3 === 0 ? "part" : "paid", count: 1 + Math.floor(random() * 3) });
  }
  plan.push({ client: "c-coastal", daysAgo: 20, settle: "unpaid", count: 2 }); // overdue agent invoice

  plan.sort((a, b) => b.daysAgo - a.daysAgo);
  for (const p of plan) {
    const client = clients.find((c) => c.id === p.client)!;
    const date = addDays(today, -p.daysAgo);
    const docLines = lines(client, p.count, client.type !== "private");
    // Own delivery (local area) and collection are free; courier rules apply elsewhere.
    const deliveryMethod = client.cash ? "collect" : deliveryFor(client.city).method;
    const courier = deliveryMethod === "courier" ? courierFor(docLines) : 0;
    const doc: Document = {
      id: `d-inv-${settings.next.invoice}`,
      kind: "invoice",
      number: formatNumber("invoice", settings.next.invoice++),
      clientId: client.id,
      date,
      dueDate: addDays(date, settings.paymentTermsDays),
      channel: defaultsFor(client.type).channel as Channel,
      lines: docLines,
      courier,
      notes: client.id === "c-cash" ? "Collected from the warehouse." : "",
      reference: client.type === "website" ? `OCTA-${(0xa1b2c3 + documents.length * 7919).toString(16).toUpperCase()}` : "",
      quoteState: "accepted",
      linkedId: null,
      cancelled: false,
      payments: [],
      createdAt: date,
      ...(client.id === "c-cash" ? { cashName: cashNames[cashCount++ % cashNames.length] } : {}),
    };
    const total = cents(docLines.reduce((n, l) => n + l.qty * l.unitPrice, 0) + courier);
    const method: Payment["method"] = client.type === "website" ? (random() > 0.5 ? "ozow" : "eft") : client.id === "c-cash" ? "cash" : "eft";
    if (p.settle === "paid") doc.payments.push({ id: `p-${doc.id}`, date: addDays(date, client.id === "c-cash" ? 0 : 2), amount: total, method, note: "" });
    if (p.settle === "part") doc.payments.push({ id: `p-${doc.id}`, date: addDays(date, 3), amount: cents(Math.round(total / 2)), method: "eft", note: "Deposit" });
    // Recent orders still to deliver; older ones were signed for on delivery.
    const recent = p.daysAgo < 10;
    const [first, ...rest] = client.name.replace(/\s*\(sample\)/, "").split(" ");
    doc.delivery = {
      method: deliveryMethod,
      status: recent ? "pending" : "delivered",
      ...(recent ? {} : { receivedName: first, receivedSurname: rest.join(" ") || "-", receivedDate: addDays(date, client.cash ? 0 : 2), signature: null }),
    };
    documents.push(doc);
  }

  // Quotes in each state, one already turned into an invoice.
  const quotePlan: { client: string; daysAgo: number; state: Document["quoteState"] }[] = [
    { client: "c-highveld", daysAgo: 3, state: "sent" },
    { client: "c-rand", daysAgo: 1, state: "draft" },
    { client: "c-coastal", daysAgo: 30, state: "declined" },
    { client: "c-pieter", daysAgo: 9, state: "accepted" },
  ];
  for (const q of quotePlan) {
    const client = clients.find((c) => c.id === q.client)!;
    const date = addDays(today, -q.daysAgo);
    const docLines = lines(client, 2, true);
    documents.push({
      id: `d-quo-${settings.next.quote}`,
      kind: "quote",
      number: formatNumber("quote", settings.next.quote++),
      clientId: client.id,
      date,
      dueDate: addDays(date, settings.quoteValidDays),
      channel: defaultsFor(client.type).channel,
      lines: docLines,
      courier: courierFor(docLines),
      notes: "Prices valid for the period shown. Courier as per OCTA courier rates.",
      reference: "",
      quoteState: q.state,
      linkedId: null,
      cancelled: false,
      payments: [],
      createdAt: date,
    });
  }

  const { suppliers, supplierInvoices } = sampleSuppliers(today);
  const base: BackofficeData = { version: 1, settings, catalogue, clients: [...clients, salesClient(created)], documents, suppliers, supplierInvoices, bank: [], reps, stock: sampleStock(today, catalogue), stockCounts: [],
    referrals: [{
      id: "rf-1", repId: "r-sipho", clientId: "c-highveld", percent: 5, contactPerson: "Marike Botha", contactDetails: "fuel@highvelddrag.example.test",
      nature: "Methanol drums for race days", agreementDate: addDays(today, -150), signatory: { name: "Zuan", capacity: "Director" }, paid: null,
      createdAt: addDays(today, -150), createdBy: "Zuan",
    }] };
  // One stock take with three OCTA-SHOT bottles missing, to show losses.
  const shot = stockLevels(base, today).find((l) => l.sku === "OCTA-SHOT-500");
  if (shot) base.stockCounts.push({ id: "sc-1", date: addDays(today, -4), sku: "OCTA-SHOT-500", expected: shot.onHand, counted: shot.onHand - 3, note: "Sample count: 3 bottles short", by: "Accounts" });
  return base;
}

/** Sample batches: one expiring soon, one old, the rest fresh. */
function sampleStock(today: string, catalogue: CatalogueItem[]): StockBatch[] {
  const plan: [string, number, string, number | null, number, string | null][] = [
    ["OCTA-X-25", -120, "X25-2606", 40, 40, "s-fuel"],
    ["OCTA-X-25", -20, "X25-2609", 300, 60, "s-fuel"],
    ["OCTA-X-210", -60, "X210-2608", 250, 12, "s-fuel"],
    ["OCTA-M-25", -60, "M25-2608", 280, 50, "s-fuel"],
    ["OCTA-M-210", -60, "M210-2608", 280, 10, "s-fuel"],
    ["OCTA-BOOST-5", -200, "B5-2604", null, 30, "s-fuel"],
    ["OCTA-BOOST-5", -30, "B5-2609", null, 40, "s-fuel"],
    ["OCTA-SHOT-500", -45, "S500-2608", 500, 150, "s-pack"],
    ["OCTA-TORQUE-500", -45, "T500-2608", 500, 120, "s-pack"],
  ];
  return plan.flatMap(([sku, offset, batchNumber, expiresIn, qty, supplierId], i) => {
    const item = catalogue.find((c) => c.sku === sku);
    if (!item || item.cost === null) return [];
    const date = addDays(today, offset);
    return [{
      id: `sb-${i + 1}`, sku, date, supplierId, supplierInvoiceId: null, batchNumber,
      expiryDate: expiresIn === null ? null : addDays(today, expiresIn), qty,
      unitCostIncl: item.cost, unitCostEx: exVat(item.cost), sellPrice: item.retail,
      notes: "Sample batch", createdAt: date, createdBy: "Zuan",
    }];
  });
}

/** In-house sales login: listed with the agents so it sees agent prices on the shop. */
function salesClient(createdAt: string): Client {
  return {
    id: "c-octa-sales", type: "agent", name: "OCTA Sales (sales@)", company: "", email: SITE.salesEmail, phone: "", vat: "",
    address: "", city: "", notes: "Company sales login (sales@). Signs in on the shop with agent prices.",
    tier: "agent", prices: {}, linkedEmail: SITE.salesEmail, createdAt,
  };
}

function sampleSuppliers(today: string): Pick<BackofficeData, "suppliers" | "supplierInvoices"> {
  const created = addDays(today, -200);
  const suppliers: Supplier[] = [
    { id: "s-fuel", name: "Inland Alcohol Supply (sample)", contact: "Sales desk", email: "accounts@inland.example.test", phone: "", vat: "4000000101", bankMatch: "INLAND ALC", notes: "Sample ethanol and methanol supplier.", createdAt: created },
    { id: "s-pack", name: "Drum & Can Packaging (sample)", contact: "", email: "", phone: "", vat: "", bankMatch: "DRUM CAN", notes: "Sample: blue plastic drums, 5L cans, labels.", createdAt: created },
    { id: "s-courier", name: "Fast Freight Courier (sample)", contact: "", email: "", phone: "", vat: "", bankMatch: "FAST FREIGHT", notes: "Sample courier account.", createdAt: created },
  ];
  const plan: [string, number, string, SupplierInvoice["category"], number, string, boolean][] = [
    ["s-fuel", -170, "IAS-20411", "stock", 31000, "Ethanol 96% and methanol, bulk", true],
    ["s-pack", -160, "DC-7781", "packaging", 6890, "210L blue drums x10, 25L drums x40", true],
    ["s-courier", -140, "FF-3302", "courier", 3150, "Deliveries, month end", true],
    ["s-fuel", -110, "IAS-20577", "stock", 29500, "Ethanol 96%, bulk", true],
    ["s-courier", -80, "FF-3419", "courier", 2780, "Deliveries, month end", true],
    ["s-fuel", -50, "IAS-20702", "stock", 33800, "Methanol 100% and ethanol 96%", true],
    ["s-pack", -35, "DC-7920", "packaging", 4210, "5L cans and labels", false],
    ["s-courier", -20, "FF-3530", "courier", 2960, "Deliveries, month end", false],
    ["s-fuel", -9, "IAS-20815", "stock", 27500, "Ethanol 96%, bulk", false],
  ];
  const supplierInvoices: SupplierInvoice[] = plan.map(([supplierId, offset, number, category, amount, description, isPaid], i) => {
    const date = addDays(today, offset);
    return {
      id: `si-${i + 1}`, supplierId, number, date, dueDate: addDays(date, 30), description, category, amount, attachment: null,
      payments: isPaid ? [{ id: `sp-${i + 1}`, date: addDays(date, 21), amount, method: "eft", note: "" }] : [],
      createdAt: date,
    };
  });
  return { suppliers, supplierInvoices };
}

/** Empty starting point for a real business (no sample clients or documents). */
export function emptyData(): BackofficeData {
  return { version: 1, settings: defaultSettings(), catalogue: baseCatalogue(false), clients: [salesClient(todaySA())], documents: [], suppliers: [], supplierInvoices: [], bank: [], reps: [], stock: [], stockCounts: [], referrals: [] };
}
