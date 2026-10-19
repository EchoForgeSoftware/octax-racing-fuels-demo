// Excel invoice and quote template for manual invoicing away from the website
// (backup when the back office is unavailable). Same layout and numbering as
// the back-office PDFs: OCTA header, bill-to block, lines with formulas,
// courier, total, EFT details and the non-VAT note.
// Writes public/templates/octa-invoice-quote-template.xlsx.
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BANK, SITE } from "../site.config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "templates", "octa-invoice-quote-template.xlsx");

const INK = "FF140E09";
const LIME = "FFB0F043";
const PAPER = "FFF2F0E7";
const RED = "FFD52200";
const LINES = 15;

function sheet(wb, kind) {
  const quote = kind === "quote";
  const ws = wb.addWorksheet(quote ? "Quote" : "Invoice", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
    views: [{ showGridLines: false }],
  });
  ws.columns = [{ width: 46 }, { width: 10 }, { width: 16 }, { width: 18 }];
  const fill = (cell, argb) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } }; };
  const money = '"R" #,##0.00';

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "OCTA PERFORMANCE";
  ws.getCell("A1").font = { name: "Arial Black", size: 20, color: { argb: LIME } };
  fill(ws.getCell("A1"), INK);
  ws.getRow(1).height = 34;
  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = `${SITE.legalName} · Reg. ${SITE.registrationNumber} · ${SITE.accountsEmail}`;
  ws.getCell("A2").font = { size: 9, color: { argb: PAPER } };
  fill(ws.getCell("A2"), INK);

  ws.getCell("A4").value = quote ? "QUOTATION" : "INVOICE";
  ws.getCell("A4").font = { name: "Arial Black", size: 16 };
  const meta = quote
    ? [["Quote no.", "QUO-0000"], ["Date", null], ["Valid until", null]]
    : [["Invoice no.", "INV-0000"], ["Date", null], ["Due date", null], ["Reference", ""]];
  meta.forEach(([label, value], i) => {
    const r = 4 + i;
    ws.getCell(`C${r}`).value = label;
    ws.getCell(`C${r}`).font = { bold: true, size: 9 };
    const c = ws.getCell(`D${r}`);
    c.value = value;
    if (label === "Date") c.value = { formula: "TODAY()" };
    if (label === "Valid until") c.value = { formula: "D5+14" };
    if (label === "Due date") c.value = { formula: "D5+7" };
    if (/Date|until/i.test(label)) c.numFmt = "dd mmm yyyy";
    c.border = { bottom: { style: "thin" } };
  });

  ws.getCell("A9").value = "BILL TO";
  ws.getCell("A9").font = { bold: true, size: 9, color: { argb: "FF6B6660" } };
  ["Name / company", "Contact person", "Address", "Email / phone", "VAT number (if any)"].forEach((label, i) => {
    const c = ws.getCell(`A${10 + i}`);
    c.value = label;
    c.font = { italic: true, color: { argb: "FF9A958C" } };
    c.border = { bottom: { style: "hair" } };
  });

  const head = 16;
  ["Description", "Qty", "Unit price", "Line total"].forEach((h, i) => {
    const c = ws.getRow(head).getCell(i + 1);
    c.value = h.toUpperCase();
    c.font = { bold: true, size: 9, color: { argb: PAPER } };
    fill(c, INK);
    c.alignment = { horizontal: i ? "right" : "left" };
  });
  for (let i = 1; i <= LINES; i++) {
    const r = head + i;
    const row = ws.getRow(r);
    if (i % 2 === 0) for (let c = 1; c <= 4; c++) fill(row.getCell(c), PAPER);
    row.getCell(3).numFmt = money;
    row.getCell(4).value = { formula: `IF(OR(B${r}="",C${r}=""),"",B${r}*C${r})` };
    row.getCell(4).numFmt = money;
  }
  ws.getCell(`A${head + 1}`).value = "e.g. OCTA-X Plus Ethanol 96% - 25L";
  ws.getCell(`A${head + 1}`).font = { italic: true, color: { argb: "FF9A958C" } };

  const last = head + LINES;
  const t = last + 2;
  const totals = [
    ["Subtotal", { formula: `SUM(D${head + 1}:D${last})` }],
    ["Courier", 0],
    ["Total", { formula: `D${t}+D${t + 1}` }],
  ];
  if (!quote) totals.push(["Paid", 0], ["Balance due", { formula: `D${t + 2}-D${t + 3}` }]);
  totals.forEach(([label, value], i) => {
    const r = t + i;
    ws.getCell(`C${r}`).value = label;
    ws.getCell(`C${r}`).font = { bold: true };
    const c = ws.getCell(`D${r}`);
    c.value = value;
    c.numFmt = money;
    c.font = { bold: label === "Total" || label === "Balance due" };
    if (label === "Balance due") { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; fill(c, RED); fill(ws.getCell(`C${r}`), RED); ws.getCell(`C${r}`).font = { bold: true, color: { argb: "FFFFFFFF" } }; }
    if (label === "Total") c.border = { top: { style: "medium" } };
  });
  ws.getCell(`A${t}`).value = "No VAT charged: the supplier is not registered for VAT.";
  ws.getCell(`A${t}`).font = { size: 9, color: { argb: "FF6B6660" } };
  ws.getCell(`A${t + 1}`).value = "Courier: R200 per pack; free on 10+ of the same 5L/25L or 12+ x 500ml. 210L drums R200 each.";
  ws.getCell(`A${t + 1}`).font = { size: 8, color: { argb: "FF6B6660" } };
  ws.getCell(`A${t + 1}`).alignment = { wrapText: true };

  let b = t + totals.length + 2;
  ws.getCell(`A${b}`).value = "PAY BY EFT";
  ws.getCell(`A${b}`).font = { bold: true, color: { argb: INK } };
  fill(ws.getCell(`A${b}`), LIME);
  const bank = [["Account holder", BANK.accountHolder], ["Bank", BANK.bank], ["Account number", BANK.accountNumber], ["Branch code", BANK.branchCode], ["Account type", BANK.accountType], ["Reference", quote ? "Quote number" : { formula: "D4" }]];
  for (const [label, value] of bank) {
    b++;
    ws.getCell(`A${b}`).value = `${label}:  `;
    ws.getCell(`A${b}`).alignment = { horizontal: "right" };
    ws.getCell(`A${b}`).font = { size: 9 };
    ws.mergeCells(`B${b}:D${b}`);
    ws.getCell(`B${b}`).value = value;
    ws.getCell(`B${b}`).font = { bold: true, size: 9 };
  }
  b += 2;
  ws.mergeCells(`A${b}:D${b}`);
  ws.getCell(`A${b}`).value = "Thank you for your business. Fuel the addiction.";
  ws.getCell(`A${b}`).alignment = { horizontal: "center" };
  ws.getCell(`A${b}`).font = { italic: true, size: 9 };
  ws.pageSetup.printArea = `A1:D${b}`;
}

const wb = new ExcelJS.Workbook();
wb.creator = SITE.legalName;
wb.created = new Date("2026-10-16T00:00:00Z");
sheet(wb, "invoice");
sheet(wb, "quote");
mkdirSync(dirname(out), { recursive: true });
await wb.xlsx.writeFile(out);
console.log(`wrote ${out.replace(root, "").replaceAll("\\", "/")}`);
