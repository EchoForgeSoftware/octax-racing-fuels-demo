import type { Costing } from "./costing";
import type { DeliverySettings } from "../delivery";
import type { CustomerProfile } from "./customerForm";
// Back-office data: the admin catalogue (prices, costs, descriptions), clients
// and their pricing, quotes, invoices and payments. The same shapes back the
// browser demo store and the Supabase tables in supabase/backoffice.sql.

/** Who the client is to the business. Drives the default sales channel and price tier. */
export type ClientType = "agent" | "bulk" | "private" | "website";

/** Price list a client buys on; per-product overrides beat the tier. */
export type PriceTier = "retail" | "agent" | "bulk";

/** Where a sale came from, for the dashboard split. */
export type Channel = "website" | "private" | "agent";

export type CatalogueCategory = "ethanol" | "methanol" | "additives" | "fuel" | "track" | "detailing" | "merch";

export type CatalogueItem = {
  sku: string;
  /** Product page slug for website products; custom items have none. */
  slug: string | null;
  productName: string;
  size: string;
  category: CatalogueCategory;
  /** Website price incl. everything except courier. null = on quotation. */
  retail: number | null;
  agent: number | null;
  bulk: number | null;
  /** What one unit costs the business, for profit. */
  cost: number | null;
  short: string;
  description: string;
  active: boolean;
  /** Added in the back office (merch, detailing) rather than built into the site. */
  custom: boolean;
  /** Announced on the shop as "coming soon"; untick once it has a price and data sheet. */
  comingSoon: boolean;
  /** Costing table (cost lines ex VAT, purity); its total can set `cost`. */
  costing?: Costing;
  /** Products added in the back office: the pack picture and label, drawn like the OCTA range. */
  pack?: PackDesign;
  /** Website stock status: always in stock (default), out of stock, or automatic from Stock control. */
  stock?: "in" | "out" | "auto";
  /** Worked out for the shop (never stored): true when the website shows it as out of stock. */
  soldOut?: boolean;
};

/** A container from the OCTA range with a label made from these words. */
export type PackDesign = {
  container: "can" | "drum" | "jug" | "bottle";
  /** Backdrop colour of the product picture. */
  colour: "lime" | "flare" | "ink" | "cobalt";
  /** Lime mark after OCTA: one letter (X, M) or a word (BOOST). */
  mark: string;
  /** Product word printed large (e.g. NITRO), with an optional lime highlight (e.g. 98%). */
  title: string;
  highlight: string;
  /** Grade tag beside the UN lines on can and drum labels (e.g. PLUS). */
  badge: string;
  un: string;
  hazardClass: string;
  pictograms: ("flame" | "goggles" | "gloves" | "respirator" | "no-flame")[];
  /** Up to three short lines on jug and bottle labels. */
  lines: string[];
  disclaimer: string;
};

export type Client = {
  id: string;
  type: ClientType;
  name: string;
  company: string;
  email: string;
  phone: string;
  vat: string;
  address: string;
  city: string;
  notes: string;
  tier: PriceTier;
  /** Per-SKU agreed prices. */
  prices: Record<string, number>;
  /** Website account linked to this client, so their prices show when signed in. */
  linkedEmail: string;
  createdAt: string;
  /** Sales rep this client is allocated to. */
  repId?: string | null;
  /** Customer Information Form, for account (permanent) customers. */
  profile?: CustomerProfile;
  /** Private clients: true = cash customer (on the private cash account); false = key customer. */
  cash?: boolean;
};

export type Rep = {
  id: string;
  name: string;
  /** Sign-in email for the rep's own view. */
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
  /** Filled in by the rep or a main admin; printed on the referral documents. */
  idNumber?: string;
  address?: string;
  bank?: { holder: string; bank: string; account: string; branch: string; type: string };
};

/** Who signs company documents, and in what capacity. */
export type Capacity = "Director" | "Manager" | "Accountant";

/** A once-off referral commission: agreement, earning and payment. */
export type Referral = {
  id: string;
  repId: string;
  clientId: string;
  /** Commission percentage of the net invoice value (excl. VAT) of the first paid sale. */
  percent: number;
  contactPerson: string;
  contactDetails: string;
  nature: string;
  agreementDate: string;
  signatory: { name: string; capacity: Capacity };
  /** Set when the commission is paid. */
  paid: { date: string; amount: number; netValue: number; invoiceId: string | null; reference: string } | null;
  createdAt: string;
  createdBy?: string;
};

export type DocLine = {
  id: string;
  sku: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  /** Cost per unit captured at the time of sale, so later cost changes don't rewrite history. */
  unitCost: number;
};

export type Payment = {
  id: string;
  date: string;
  amount: number;
  method: "eft" | "cash" | "card" | "ozow" | "other";
  note: string;
  /** Admin who recorded it. */
  by?: string;
};

/** How the goods reach the client, and proof they were received. */
export type Delivery = {
  method: "own" | "courier" | "collect";
  status: "pending" | "delivered";
  receivedName?: string;
  receivedSurname?: string;
  receivedDate?: string;
  /** Signature drawn on screen, as a PNG data URL. */
  signature?: string | null;
  deliveredBy?: string;
};

export type QuoteState = "draft" | "sent" | "accepted" | "declined";

export type Document = {
  id: string;
  kind: "quote" | "invoice";
  number: string;
  clientId: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** Invoices: payment due. Quotes: valid until. */
  dueDate: string;
  channel: Channel;
  lines: DocLine[];
  courier: number;
  notes: string;
  /** Website order reference, or the client's own order number. */
  reference: string;
  quoteState: QuoteState;
  /** Quote → invoice link (set on both sides). */
  linkedId: string | null;
  cancelled: boolean;
  payments: Payment[];
  createdAt: string;
  /** Admin who first saved it. */
  createdBy?: string;
  /** Cash sales: the customer's name, shown with the invoice number and amount. */
  cashName?: string;
  /** Quotes only: a pro forma invoice (payment requested before supply), numbered PRO-0001. */
  proforma?: boolean;
  /** Invoices: delivery method and goods-received sign-off. Missing on older records = delivered. */
  delivery?: Delivery;
};

export type BusinessSettings = {
  businessName: string;
  tradingAs: string;
  registration: string;
  vatRegistered: boolean;
  vatNumber: string;
  address: string;
  email: string;
  phone: string;
  bank: { holder: string; bank: string; account: string; branch: string; type: string };
  paymentTermsDays: number;
  quoteValidDays: number;
  invoiceFooter: string;
  /** Courier charge per pack (R); free-delivery thresholds stay as per the policy. */
  courierFee?: number;
  /** Main admins open and close online ordering on the website (Settings). Closed when missing. */
  onlineOrdering?: boolean;
  /** Collection and delivery rules for website orders (Settings → Delivery). */
  deliveryRules?: Partial<DeliverySettings>;
  /** Who gets an email for every website order (comma separated). Empty = info@ and zuan@. */
  orderEmails?: string;
  next: { quote: number; invoice: number };
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  vat: string;
  /** Words that identify this supplier on a bank statement, e.g. "SASOL CHEM". */
  bankMatch: string;
  notes: string;
  createdAt: string;
};

export type ExpenseCategory = "stock" | "packaging" | "courier" | "marketing" | "rent" | "other";

export type Attachment = {
  name: string; type: string; size: number;
  /** The file itself, as a data URL: kept in the demo; live, only until the server stores it. */
  dataUrl: string | null;
  /** Live: the file is stored on the server and opened on request. */
  stored?: boolean;
};

export type SupplierInvoice = {
  id: string;
  supplierId: string;
  /** The supplier's own invoice number. */
  number: string;
  date: string;
  dueDate: string;
  description: string;
  category: ExpenseCategory;
  /** Amount on the supplier invoice, as billed. */
  amount: number;
  attachment: Attachment | null;
  payments: Payment[];
  createdAt: string;
  createdBy?: string;
};

/** What a bank line has been matched to. */
export type Allocation =
  | { kind: "invoice"; docId: string; paymentId: string; auto: boolean }
  | { kind: "supplier"; invoiceId: string; paymentId: string; auto: boolean }
  | { kind: "other"; category: "fees" | "transfer" | "income" | ExpenseCategory; note: string; auto: boolean };

export type BankTxn = {
  id: string;
  date: string;
  description: string;
  /** Money in is positive, money out negative. */
  amount: number;
  balance: number | null;
  /** File it came from, for the import history. */
  source: string;
  allocation: Allocation | null;
};

/** Stock booked in: one delivery of one product, with its batch and expiry. */
export type StockBatch = {
  id: string;
  sku: string;
  /** Date booked in. */
  date: string;
  supplierId: string | null;
  supplierInvoiceId: string | null;
  batchNumber: string;
  expiryDate: string | null;
  qty: number;
  /** Cost per unit excluding VAT, and including 15% VAT. */
  unitCostEx: number;
  unitCostIncl: number;
  /** Selling price set at book-in, for the profit check. */
  sellPrice: number | null;
  notes: string;
  createdAt: string;
  createdBy?: string;
};

/** A stock-take line: what the system expected against what was counted. */
export type StockCount = {
  id: string;
  date: string;
  sku: string;
  expected: number;
  counted: number;
  note: string;
  by?: string;
};

export type BackofficeData = {
  version: 1;
  settings: BusinessSettings;
  catalogue: CatalogueItem[];
  clients: Client[];
  documents: Document[];
  suppliers: Supplier[];
  supplierInvoices: SupplierInvoice[];
  bank: BankTxn[];
  reps: Rep[];
  stock: StockBatch[];
  stockCounts: StockCount[];
  referrals: Referral[];
};
