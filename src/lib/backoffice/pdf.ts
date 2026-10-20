// Branded A4 PDFs for quotes, invoices and client statements, drawn in the
// browser with pdf-lib (no server, no external fonts). Uses the PDF standard
// Helvetica faces, so text is limited to the Windows-1252 character set.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { deliveryRules } from "../delivery";
import { balance, docSubtotal, docTotal, lineTotal, paid, priceFor, statement, STATUS_LABEL, invoiceStatus, quoteStatus } from "./calc";
import type { BusinessSettings, CatalogueItem, Client, Document, Referral, Rep } from "./types";
import { paymentAcknowledgementText, referralAgreementText, type Block } from "./referralText";
import { customerFormText } from "./customerForm";

const INK = rgb(0.078, 0.055, 0.035);
const PAPER = rgb(0.949, 0.941, 0.906);
const RED = rgb(0.835, 0.133, 0);
const LIME = rgb(0.69, 0.941, 0.263);
const MUTED = rgb(0.42, 0.4, 0.37);
const LINE = rgb(0.84, 0.83, 0.79);
const WHITE = rgb(1, 1, 1);

const A4 = { w: 595.28, h: 841.89 };
const M = 42; // page margin

const money = (n: number) => {
  const [r, c] = (Math.round(n * 100) / 100).toFixed(2).split(".");
  return `R ${r.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}.${c}`;
};

const longDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

/** Keep only characters the standard PDF fonts can encode. */
function clean(text: string): string {
  return text
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/ /g, " ")
    .replace(/[^\n -~ -ÿ€•]/g, "?");
}

type Fonts = { regular: PDFFont; bold: PDFFont };

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split(/\n/)) {
    let line = "";
    const words = para.split(/\s+/).flatMap(word => {
      const pieces: string[] = []; let part = "";
      for (const char of word) { if (part && font.widthOfTextAtSize(part + char,size) > width) { pieces.push(part); part=""; } part += char; }
      if(part) pieces.push(part); return pieces;
    });
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size: number, color = INK, align: "left" | "right" = "left") {
  const s = clean(value);
  const w = font.widthOfTextAtSize(s, size);
  page.drawText(s, { x: align === "right" ? x - w : x, y, size, font, color });
}

/** OCTA wordmark from the label artwork, drawn as vectors (top-left at x, y). */
function wordmark(page: PDFPage, x: number, y: number, scale: number, fonts: Fonts) {
  const s = { x, y, scale };
  page.drawSvgPath("M18 0 H54 Q72 0 72 18 V52 Q72 70 54 70 H18 Q0 70 0 52 V18 Q0 0 18 0 Z", { ...s, color: RED });
  page.drawSvgPath("M24 18 Q18 18 18 24 V46 Q18 52 24 52 H48 Q54 52 54 46 V24 Q54 18 48 18 Z", { ...s, color: WHITE });
  page.drawSvgPath("M142 0 H96 Q80 0 80 16 V54 Q80 70 96 70 H142 V52 H104 Q98 52 98 46 V24 Q98 18 104 18 H142 Z", { ...s, color: INK });
  page.drawSvgPath("M148 0 H206 V18 H186 V70 H168 V18 H148 Z", { ...s, color: INK });
  page.drawSvgPath("M208 70 L245 0 L282 70 Z", { ...s, color: INK });
  page.drawSvgPath("M224 70 L245 30 L266 70 Z", { ...s, color: WHITE });
  page.drawSvgPath("M235 70 L245 51 L255 70 Z", { ...s, color: INK });
  page.drawText("P E R F O R M A N C E", { x: x + 1, y: y - 84 * scale, size: 17 * scale * 0.9, font: fonts.bold, color: INK });
}

/** Black and lime hazard stripe across the top of the page. */
function hazard(page: PDFPage, y: number, height: number) {
  page.drawRectangle({ x: 0, y, width: A4.w, height, color: INK });
  for (let x = -height; x < A4.w + height; x += 18) {
    page.drawSvgPath(`M ${x} ${height} L ${x + 9} ${height} L ${x + 9 + height} 0 L ${x + height} 0 Z`, { x: 0, y: y + height, color: LIME });
  }
}

function header(page: PDFPage, fonts: Fonts, title: string, meta: [string, string][]) {
  hazard(page, A4.h - 14, 14);
  wordmark(page, M, A4.h - 42, 0.42, fonts);
  // Long titles shrink so they never run into the wordmark on the left.
  const titleSize = Math.min(24, (A4.w - 2 * M - 175) / fonts.bold.widthOfTextAtSize(clean(title), 1));
  text(page, title, A4.w - M, A4.h - 66, fonts.bold, titleSize, INK, "right");
  let y = A4.h - 86;
  for (const [k, v] of meta) {
    text(page, k.toUpperCase(), A4.w - M - 240, y, fonts.bold, 7.5, MUTED);
    const lines=wrap(v,fonts.bold,9,145);
    for(const line of lines){text(page,line,A4.w-M,y,fonts.bold,9,INK,"right");y-=13;}
  }
  return y;
}

function partyBlocks(page: PDFPage, fonts: Fonts, settings: BusinessSettings, client: Client | null, top: number, cashName = "") {
  const col = (A4.w - 2 * M - 20) / 2;
  const from = [
    settings.businessName,
    settings.tradingAs ? `Trading as ${settings.tradingAs}` : "",
    settings.registration ? `Reg. no. ${settings.registration}` : "",
    settings.vatRegistered && settings.vatNumber ? `VAT no. ${settings.vatNumber}` : "Not registered for VAT",
    settings.address,
    settings.email ? `Enquiries: ${settings.email}` : "",
    settings.phone,
  ].filter(Boolean);
  const to = cashName
    ? [cashName, "Cash sale"]
    : client
    ? [client.company || client.name, client.company ? client.name : "", client.address, client.city, client.email, client.phone, client.vat ? `VAT no. ${client.vat}` : ""].filter(Boolean)
    : ["Cash sale"];
  let y = top;
  let bottom = y;
  for (const [label, lines, x] of [["From", from, M], ["Bill to", to, M + col + 20]] as const) {
    page.drawRectangle({ x, y: y - 4, width: col, height: 2, color: INK });
    text(page, label.toUpperCase(), x, y + 4, fonts.bold, 7.5, MUTED);
    let ly = y - 18;
    lines.forEach((l, i) => {
      for (const w of wrap(l, i === 0 ? fonts.bold : fonts.regular, 9, col)) { text(page, w, x, ly, i === 0 ? fonts.bold : fonts.regular, i === 0 ? 10 : 9); ly -= 12; }
    });
    bottom = Math.min(bottom,ly);
  }
  return bottom - 16;
}

function bankBox(page: PDFPage, fonts: Fonts, settings: BusinessSettings, reference: string, y: number) {
  const rows: [string, string][] = [
    ["Account holder", settings.bank.holder], ["Bank", settings.bank.bank], ["Account type", settings.bank.type],
    ["Account number", settings.bank.account], ["Branch code", settings.bank.branch], ["Payment reference", reference],
  ];
  const h = 30 + rows.length * 13; // room for the heading and a margin under the last row
  page.drawRectangle({ x: M, y: y - h, width: 250, height: h, color: INK });
  text(page, "PAY BY EFT", M + 12, y - 14, fonts.bold, 8, LIME);
  rows.forEach(([k, v], i) => {
    text(page, k, M + 12, y - 30 - i * 13, fonts.regular, 8, PAPER);
    text(page, v, M + 238, y - 30 - i * 13, fonts.bold, 8.5, k === "Payment reference" ? LIME : WHITE, "right");
  });
  return y - h;
}

function footer(page: PDFPage, fonts: Fonts, settings: BusinessSettings, n: number, of: number) {
  page.drawRectangle({ x: M, y: 40, width: A4.w - 2 * M, height: 1, color: LINE });
  const footerLine = settings.email ? `${settings.invoiceFooter}  Enquiries: ${settings.email}` : settings.invoiceFooter;
  for (const [i,line] of wrap(footerLine,fonts.regular,7,A4.w-2*M).slice(0,2).entries()) text(page,line,M,29-i*9,fonts.regular,7,MUTED);
  text(page, `${settings.businessName}  |  Page ${n} of ${of}`, A4.w - M, 43, fonts.regular, 7, MUTED, "right");
}

async function setup() {
  const pdf = await PDFDocument.create();
  const fonts = { regular: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold) };
  return { pdf, fonts };
}

/** Delivery terms from Settings → Delivery and collection, as printed on price lists. */
function deliveryTerms(settings: BusinessSettings) {
  const r = deliveryRules(settings);
  const towns = r.localTowns.map((t) => t.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
  return [
    r.collection.enabled ? "Collection is free." : "",
    `OCTA delivers within ${r.localKm} km of ${towns}${r.minLitres > 0 ? ` on orders of ${r.minLitres} L or more` : ""}${r.localFee !== null ? ` (${money(r.localFee)})` : ""}.`,
    r.courierOnline ? `Courier elsewhere: ${money(r.courierFee)} per pack.` : "Courier elsewhere is quoted on request and paid before dispatch.",
  ].filter(Boolean).join(" ");
}

const DELIVERY_TEXT = { own: "OCTA local delivery", courier: "Courier", collect: "Collected by the client" } as const;
const PAID_VIA: Record<string, string> = { ozow: "Ozow (website)", eft: "EFT", cash: "Cash", card: "Card", other: "Other" };
/** Same wording as the product labels, printed small on every delivery note. */
const DISCLAIMER = "USE AT OWN RISK. OCTA products are for performance use only. To the maximum extent permitted by law, OCTA, ZRG-X (PTY) LTD and their directors and owners are not liable for loss, injury or damage arising from their use, other than liability that cannot lawfully be excluded.";

/** Delivery method, payment status and the goods-received sign-off (filled in when signed on screen). */
async function deliveryNote(pdf: PDFDocument, page: PDFPage, fonts: Fonts, doc: Document, top: number): Promise<number> {
  const w = A4.w - 2 * M;
  const d = doc.delivery;
  page.drawRectangle({ x: M, y: top - 18, width: w, height: 18, color: INK });
  text(page, "DELIVERY NOTE  ·  GOODS RECEIVED", M + 8, top - 12.5, fonts.bold, 8, LIME);
  let y = top - 32;
  text(page, `Delivery: ${d ? DELIVERY_TEXT[d.method] : "As arranged"}`, M, y, fonts.bold, 9);
  const methods = [...new Set(doc.payments.map((p) => PAID_VIA[p.method] ?? p.method))];
  const payLine = balance(doc) <= 0.004 && doc.payments.length
    ? `PAID via ${methods.join(" + ")}${doc.channel === "website" ? " · website order" : ""}`
    : doc.channel === "website" ? "Website order · payment pending" : "";
  if (payLine) text(page, payLine, A4.w - M, y, fonts.bold, 9, payLine.startsWith("PAID") ? INK : RED, "right");
  y -= 48;
  const signed = d?.status === "delivered";
  const fields: [string, string, number][] = [
    ["Name", signed ? d?.receivedName ?? "" : "", M],
    ["Surname", signed ? d?.receivedSurname ?? "" : "", M + w * 0.27],
    ["Date", signed && d?.receivedDate ? longDate(d.receivedDate) : "", M + w * 0.54],
  ];
  for (const [label, value, x] of fields) {
    text(page, label.toUpperCase(), x, y + 12, fonts.bold, 6.5, MUTED);
    if (value) text(page, value, x, y + 1, fonts.regular, 9);
    page.drawRectangle({ x, y: y - 3, width: w * 0.24, height: 0.7, color: INK });
  }
  const sx = M + w * 0.79;
  text(page, "SIGNATURE", sx, y + 30, fonts.bold, 6.5, MUTED);
  if (signed && d?.signature?.startsWith("data:image/png")) {
    try {
      const img = await pdf.embedPng(d.signature);
      const scale = Math.min((w * 0.21) / img.width, 30 / img.height);
      page.drawImage(img, { x: sx, y: y - 2, width: img.width * scale, height: img.height * scale });
    } catch { /* unreadable signature: leave the line blank */ }
  }
  page.drawRectangle({ x: sx, y: y - 3, width: w * 0.21, height: 0.7, color: INK });
  y -= 16;
  text(page, signed ? `Goods received in good order${d?.deliveredBy ? ` · signed on screen with ${d.deliveredBy}` : ""}.` : "I confirm the goods above were received in good order.", M, y, fonts.regular, 7.5, MUTED);
  y -= 12;
  for (const line of wrap(DISCLAIMER, fonts.regular, 5.8, w)) { text(page, line, M, y, fonts.regular, 5.8, MUTED); y -= 7.5; }
  return y - 6;
}

export function documentTitle(doc: Document, settings: BusinessSettings) {
  if (doc.kind === "quote") return doc.proforma ? "PRO FORMA INVOICE" : "QUOTATION";
  return settings.vatRegistered ? "TAX INVOICE" : "INVOICE";
}

export async function documentPdf(doc: Document, client: Client | null, settings: BusinessSettings, today: string): Promise<Uint8Array> {
  const { pdf, fonts } = await setup();
  pdf.setTitle(`${documentTitle(doc, settings)} ${doc.number}`);
  pdf.setAuthor(settings.businessName);
  const status = doc.kind === "invoice" ? STATUS_LABEL[invoiceStatus(doc, today)] : STATUS_LABEL[quoteStatus(doc, today)];
  const meta: [string, string][] = [
    [doc.kind === "quote" ? "Quote no." : "Invoice no.", doc.number],
    ["Date", longDate(doc.date)],
    [doc.kind === "quote" ? "Valid until" : "Due date", longDate(doc.dueDate)],
    ...(doc.reference ? [["Reference", doc.reference] as [string, string]] : []),
    ["Status", status],
  ];

  let page = pdf.addPage([A4.w, A4.h]);
  let y = partyBlocks(page, fonts, settings, client, header(page, fonts, documentTitle(doc, settings), meta) - 14, doc.cashName ?? "");

  // Line items.
  const cols = { desc: M + 8, qty: A4.w - M - 190, unit: A4.w - M - 92, amount: A4.w - M - 8 };
  const tableHeader = () => {
    page.drawRectangle({ x: M, y: y - 20, width: A4.w - 2 * M, height: 20, color: INK });
    text(page, "DESCRIPTION", cols.desc, y - 13.5, fonts.bold, 7.5, PAPER);
    text(page, "QTY", cols.qty, y - 13.5, fonts.bold, 7.5, PAPER, "right");
    text(page, "UNIT PRICE", cols.unit, y - 13.5, fonts.bold, 7.5, PAPER, "right");
    text(page, "AMOUNT", cols.amount, y - 13.5, fonts.bold, 7.5, PAPER, "right");
    y -= 20;
  };
  tableHeader();
  doc.lines.forEach((l, i) => {
    const desc = wrap(l.description || "Item", fonts.regular, 9, cols.qty - cols.desc - 40);
    const h = 10 + desc.length * 12;
    if (y - h < 310) {
      page = pdf.addPage([A4.w, A4.h]);
      y = header(page, fonts, documentTitle(doc, settings), [[doc.kind === "quote" ? "Quote no." : "Invoice no.", doc.number]]) - 20;
      tableHeader();
    }
    if (i % 2) page.drawRectangle({ x: M, y: y - h, width: A4.w - 2 * M, height: h, color: PAPER });
    desc.forEach((d, j) => text(page, d, cols.desc, y - 15 - j * 12, fonts.regular, 9));
    text(page, String(l.qty), cols.qty, y - 15, fonts.regular, 9, INK, "right");
    text(page, money(l.unitPrice), cols.unit, y - 15, fonts.regular, 9, INK, "right");
    text(page, money(lineTotal(l)), cols.amount, y - 15, fonts.bold, 9, INK, "right");
    y -= h;
  });
  page.drawRectangle({ x: M, y, width: A4.w - 2 * M, height: 1.5, color: INK });

  // Totals.
  const totals: [string, string, boolean][] = [
    ["Subtotal", money(docSubtotal(doc)), false],
    [doc.delivery?.method === "collect" ? "Collection" : "Delivery", doc.courier > 0 ? money(doc.courier) : "Free", false],
    ["Total", money(docTotal(doc)), true],
  ];
  if (doc.kind === "invoice" && doc.payments.length) {
    totals.push(["Paid", `- ${money(paid(doc))}`, false], ["Balance due", money(balance(doc)), true]);
  }
  let ty = y - 18;
  for (const [k, v, strong] of totals) {
    if (strong) page.drawRectangle({ x: A4.w - M - 200, y: ty - 6, width: 200, height: 20, color: k === "Balance due" ? RED : INK });
    text(page, k.toUpperCase(), A4.w - M - 192, ty, fonts.bold, 8, strong ? WHITE : MUTED);
    text(page, v, cols.amount, ty, fonts.bold, strong ? 11 : 9.5, strong ? WHITE : INK, "right");
    ty -= 22;
  }
  const vatNote = settings.vatRegistered
    ? `Total includes VAT at 15%: ${money(docTotal(doc) - docTotal(doc) / 1.15)}`
    : "No VAT charged: the supplier is not registered for VAT.";
  text(page, vatNote, A4.w - M, ty, fonts.regular, 7.5, MUTED, "right");

  // Payment details and notes on the left.
  let ny = bankBox(page, fonts, settings, doc.number, y - 12) - 16;
  if (doc.notes) {
    text(page, "NOTES", M, ny, fonts.bold, 7.5, MUTED);
    ny -= 12;
    for (const w of wrap(doc.notes, fonts.regular, 8.5, A4.w - 2 * M)) {
      if (ny < 92) { page=pdf.addPage([A4.w,A4.h]); ny=header(page,fonts,"DOCUMENT NOTES",[["Reference",doc.number]])-25; }
      text(page, w, M, ny, fonts.regular, 8.5); ny -= 11;
    }
  }
  if (doc.kind === "invoice") {
    if (ny < 250) { page = pdf.addPage([A4.w, A4.h]); ny = header(page, fonts, "DELIVERY NOTE", [["Invoice no.", doc.number]]) - 25; }
    ny = await deliveryNote(pdf, page, fonts, doc, ny - 6);
  }
  if (doc.kind === "quote") {
    if(ny<90) {page=pdf.addPage([A4.w,A4.h]);ny=header(page,fonts,"QUOTATION",[["Reference",doc.number]])-25;}
    text(page, "To accept, reply with this quote number. Courier is included only as shown above.", M, ny - 8, fonts.regular, 8, MUTED);
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => footer(p, fonts, settings, i + 1, pages.length));
  return pdf.save();
}

export async function statementPdf(client: Client, docs: Document[], settings: BusinessSettings, from: string, to: string): Promise<Uint8Array> {
  const { pdf, fonts } = await setup();
  pdf.setTitle(`Statement ${client.company || client.name}`);
  const { opening, rows, closing } = statement(client.id, docs, from, to);
  let page = pdf.addPage([A4.w, A4.h]);
  const meta: [string, string][] = [["Statement date", longDate(to)], ["Period", from ? `${longDate(from)} - ${longDate(to)}` : `Up to ${longDate(to)}`], ["Amount due", money(Math.max(0, closing))]];
  let y = partyBlocks(page, fonts, settings, client, header(page, fonts, "STATEMENT", meta) - 14);
  const cols = { date: M + 8, desc: M + 80, debit: A4.w - M - 150, credit: A4.w - M - 78, bal: A4.w - M - 8 };
  const head = () => {
    page.drawRectangle({ x: M, y: y - 20, width: A4.w - 2 * M, height: 20, color: INK });
    for (const [label, x, align] of [["DATE", cols.date, "left"], ["DESCRIPTION", cols.desc, "left"], ["CHARGES", cols.debit, "right"], ["PAYMENTS", cols.credit, "right"], ["BALANCE", cols.bal, "right"]] as const) {
      text(page, label, x, y - 13.5, fonts.bold, 7.5, PAPER, align);
    }
    y -= 20;
  };
  head();
  const all = [{ date: from, description: "Opening balance", reference: "", debit: 0, credit: 0, balance: opening }, ...rows];
  all.forEach((r, i) => {
    if (y < 200) { page = pdf.addPage([A4.w, A4.h]); y = header(page, fonts, "STATEMENT", [["Client", client.company || client.name]]) - 20; head(); }
    if (i % 2) page.drawRectangle({ x: M, y: y - 18, width: A4.w - 2 * M, height: 18, color: PAPER });
    text(page, r.date || "", cols.date, y - 12.5, fonts.regular, 8);
    text(page, r.description.slice(0,36), cols.desc, y - 12.5, i === 0 ? fonts.bold : fonts.regular, 8);
    if (r.debit) text(page, money(r.debit), cols.debit, y - 12.5, fonts.regular, 8, INK, "right");
    if (r.credit) text(page, money(r.credit), cols.credit, y - 12.5, fonts.regular, 8, INK, "right");
    text(page, money(r.balance), cols.bal, y - 12.5, fonts.bold, 8, INK, "right");
    y -= 18;
  });
  page.drawRectangle({ x: A4.w - M - 200, y: y - 30, width: 200, height: 22, color: closing > 0 ? RED : INK });
  text(page, closing > 0 ? "AMOUNT DUE" : "BALANCE", A4.w - M - 192, y - 22, fonts.bold, 8, WHITE);
  text(page, money(closing), cols.bal, y - 22, fonts.bold, 11, WHITE, "right");
  bankBox(page, fonts, settings, client.company || client.name, y - 12);
  const pages = pdf.getPages();
  pages.forEach((p, i) => footer(p, fonts, settings, i + 1, pages.length));
  return pdf.save();
}

/** Trigger a browser download of a generated PDF. */
/** The client's own price list: their agreed prices, else their list (agent, bulk or website). */
export async function priceListPdf(client: Client, catalogue: CatalogueItem[], settings: BusinessSettings, today: string): Promise<Uint8Array> {
  const { pdf, fonts } = await setup();
  pdf.setTitle(`Price list ${client.company || client.name}`);
  let page = pdf.addPage([A4.w, A4.h]);
  const list = { retail: "Website", agent: "Agent", bulk: "Bulk" }[client.tier];
  let y = partyBlocks(page, fonts, settings, client, header(page, fonts, "PRICE LIST", [["Date", longDate(today)], ["Price list", `${list} prices`], ["Agreed prices", String(Object.keys(client.prices).length)]]) - 14);
  const cols = { product: M + 8, size: A4.w - M - 230, website: A4.w - M - 100, yours: A4.w - M - 8 };
  const head = () => {
    page.drawRectangle({ x: M, y: y - 20, width: A4.w - 2 * M, height: 20, color: INK });
    for (const [label, x, align] of [["PRODUCT", cols.product, "left"], ["SIZE", cols.size, "left"], ["WEBSITE", cols.website, "right"], ["YOUR PRICE", cols.yours, "right"]] as const) {
      text(page, label, x, y - 13.5, fonts.bold, 7.5, PAPER, align);
    }
    y -= 20;
  };
  head();
  const items = catalogue.filter((i) => i.active && !i.comingSoon);
  items.forEach((item, i) => {
    const names=wrap(item.productName,fonts.bold,8.5,cols.size-cols.product-12);
    const sizes=wrap(item.size,fonts.regular,8.5,cols.website-cols.size-65);
    const rowHeight=8+Math.max(names.length,sizes.length)*12;
    if (y-rowHeight < 150) { page = pdf.addPage([A4.w, A4.h]); y = header(page, fonts, "PRICE LIST", [["Client", client.company || client.name]]) - 20; head(); }
    const yours = priceFor(item, client);
    const agreed = client.prices[item.sku] !== undefined;
    if (i % 2) page.drawRectangle({ x: M, y: y - rowHeight, width: A4.w - 2 * M, height: rowHeight, color: PAPER });
    names.forEach((line,j)=>text(page,line,cols.product,y-12.5-j*12,fonts.bold,8.5));
    sizes.forEach((line,j)=>text(page,line,cols.size,y-12.5-j*12,fonts.regular,8.5));
    text(page, item.retail === null ? "On quote" : money(item.retail), cols.website, y - 12.5, fonts.regular, 8.5, MUTED, "right");
    text(page, yours === null ? "On quote" : money(yours), cols.yours, y - 12.5, fonts.bold, 8.5, agreed ? RED : INK, "right");
    y -= rowHeight;
  });
  y -= 16;
  const notes = [
    `${settings.vatRegistered ? "Prices include VAT at 15%." : "No VAT charged: the supplier is not registered for VAT."} ${deliveryTerms(settings)}`,
    "Prices in red are agreed for your account. They show automatically when you sign in on the OCTA website with your account email.",
    "Prices can change weekly. This list is valid on the date shown; ask us for a quote for large orders.",
  ];
  for (const n of notes) for (const line of wrap(n, fonts.regular, 8, A4.w - 2 * M)) { text(page, line, M, y, fonts.regular, 8, MUTED); y -= 11; }
  const pages = pdf.getPages();
  pages.forEach((p, i) => footer(p, fonts, settings, i + 1, pages.length));
  return pdf.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Share the PDF through the phone's share sheet (WhatsApp, email…) where supported. */
export async function sharePdf(bytes: Uint8Array, filename: string, title: string): Promise<boolean> {
  const file = new File([bytes as BlobPart], filename, { type: "application/pdf" });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try { await navigator.share({ files: [file], title }); return true; } catch { return false; }
}

/** Render a text document (agreement, acknowledgement, form) from blocks, with page breaks. */
async function blocksPdf(title: string, meta: [string, string][], blocks: Block[], settings: BusinessSettings): Promise<Uint8Array> {
  const { pdf, fonts } = await setup();
  pdf.setTitle(title);
  pdf.setAuthor(settings.businessName);
  const w = A4.w - 2 * M;
  let page = pdf.addPage([A4.w, A4.h]);
  let y = header(page, fonts, title.toUpperCase(), meta) - 18;
  const need = (h: number) => {
    if (y - h < 80) { page = pdf.addPage([A4.w, A4.h]); y = header(page, fonts, title.toUpperCase(), [["Company", settings.businessName]]) - 18; }
  };
  const para = (s: string, font = fonts.regular, size = 9, indent = 0, color = INK) => {
    for (const line of wrap(s, font, size, w - indent)) { need(13); text(page, line, M + indent, y, font, size, color); y -= size + 3.5; }
  };
  for (const b of blocks) {
    if ("h" in b) { need(30); y -= 6; page.drawRectangle({ x: M, y: y - 4, width: w, height: 1.2, color: INK }); para(b.h, fonts.bold, 10); y -= 2; }
    else if ("p" in b) { const indent = /^\([a-z]\)/.test(b.p) ? 14 : 0; para(b.p, fonts.regular, 9, indent); y -= 3; }
    else if ("bullets" in b) { for (const item of b.bullets) para(`•  ${item}`, fonts.regular, 9, 10); y -= 3; }
    else if ("note" in b) { y -= 6; para(b.note, fonts.regular, 7.5, 0, MUTED); }
    else if ("fields" in b) {
      for (const [k, v] of b.fields) {
        const label = /[?.:]$/.test(k) ? k : `${k}:`;
        const lw = Math.min(fonts.bold.widthOfTextAtSize(clean(label), 8.5) + 8, w * 0.48);
        const lines = wrap(v || " ", fonts.regular, 9, w - lw - 4);
        need(14 * lines.length + 4);
        text(page, label, M, y, fonts.bold, 8.5);
        lines.forEach((line, i) => text(page, line, M + lw, y - i * 12, fonts.regular, 9));
        page.drawRectangle({ x: M + lw, y: y - 3 - (lines.length - 1) * 12, width: w - lw, height: 0.5, color: LINE });
        y -= 12 * lines.length + 5;
      }
      y -= 3;
    } else if ("sign" in b) {
      const col = (w - 20) / 2;
      const rows = Math.max(...b.sign.map((s) => s.rows.length));
      need(28 + rows * 22);
      b.sign.forEach((s, i) => {
        const x = M + i * (col + 20);
        text(page, s.party, x, y, fonts.bold, 8);
        s.rows.forEach(([k, v], r) => {
          const ry = y - 22 - r * 22;
          text(page, `${k}:`, x, ry, fonts.regular, 8, MUTED);
          if (v) text(page, v, x + 80, ry, fonts.bold, 9);
          page.drawRectangle({ x: x + 80, y: ry - 3, width: col - 80, height: 0.6, color: INK });
        });
      });
      y -= 30 + rows * 22;
    }
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => footer(p, fonts, settings, i + 1, pages.length));
  return pdf.save();
}

export function referralAgreementPdf(ref: Referral, rep: Rep, client: Client | null, settings: BusinessSettings) {
  return blocksPdf("Referral Commission Agreement", [["Referrer", rep.name], ["Client", client ? client.company || client.name : "-"], ["Commission", `${ref.percent}%`]], referralAgreementText(ref, rep, client, settings), settings);
}

export function paymentAcknowledgementPdf(ref: Referral, rep: Rep, client: Client | null, settings: BusinessSettings) {
  return blocksPdf("Acknowledgement of Payment", [["Full and final settlement", "Once-off referral commission"], ["Recipient", rep.name], ["Amount", ref.paid ? money(ref.paid.amount) : "-"]], paymentAcknowledgementText(ref, rep, client, settings), settings);
}

export function customerFormPdf(client: Client, settings: BusinessSettings) {
  return blocksPdf("Customer Information Form", [["Account setup", "Authorised portal users"], ["Customer", client.company || client.name]], customerFormText(client, settings), settings);
}
