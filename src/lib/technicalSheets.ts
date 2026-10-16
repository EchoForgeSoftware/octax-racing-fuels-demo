import sheets from "@/data/technical-sheets.json";

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
}));

export type TechnicalSheet = (typeof technicalSheets)[number];
export function getTechnicalSheet(slug: string) {
  return technicalSheets.find((sheet) => sheet.slug === slug);
}
