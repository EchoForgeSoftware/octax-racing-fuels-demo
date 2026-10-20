import sheets from "@/data/technical-sheets.json";
import brochures from "@/data/brochures.json";

const hasBrochure = new Set(brochures.map((b) => b.slug));

export const technicalSheets = sheets.map((sheet) => ({
  slug: sheet.slug,
  name: sheet.name,
  category: sheet.category,
  description: sheet.description,
  dosage: sheet.dosage,
  summary: sheet.summary,
  edition: sheet.edition,
  pages: sheet.pages,
  pdf: `/data-sheets/${sheet.slug}-technical-data-sheet.pdf`,
  preview: `/data-sheets/${sheet.slug}-preview.webp`,
  /** One-page product brochure (scripts/generate-brochures.py), when there is one. */
  brochure: hasBrochure.has(sheet.slug) ? `/brochures/${sheet.slug}-brochure.pdf` : null,
}));

export type TechnicalSheet = (typeof technicalSheets)[number];
export function getTechnicalSheet(slug: string) {
  return technicalSheets.find((sheet) => sheet.slug === slug);
}
