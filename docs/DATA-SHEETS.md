# Branded technical data sheets

## Landscape label and image pack

`output/OCTA-brand-pack.zip` contains all three available technical sheets,
their combined PDF, five landscape label PNG/SVG masters and a combined label
PDF, eight 4000px catalogue packaging illustrations and logo assets. Label PNGs
are 6000x3750px. The 210L ethanol and methanol drum variants are included.
The mockups retain the website's portrait labels; the separate landscape
artwork is for the printer to resize/apply. No new pack sizes are offered.

Rebuild with `node scripts/generate-brand-art.mjs`, then run
`scripts/assemble-brand-pack.py` using the PDF runtime. Inspect every rendered
PDF page in `tmp/pdfs/brand-pack/`. The archive's READ-ME describes physical
sizing, fonts, RGB colours, lack of bleed/cut lines and remaining supplier/SDS
approval requirements. These are artwork masters, not certified final labels.

## Technical sheets

The three PDFs in `public/data-sheets/` are newly authored documents, not
overlays on supplier PDFs. The originals' page images, logos, product codes,
metadata and attachments are not copied into the deliverables. The OCTA logo,
product art and ZRG-X logo come from this website. They are technical data
sheets (TDS), not Safety Data Sheets (SDS).

## Source mapping and editorial changes

The user confirmed on 16 October 2026:

| Supplied document | OCTA product | Output |
| --- | --- | --- |
| AOB 235.pdf | OCTA-BOOST | 1 page |
| C6 OCTANE BOOSTER.pdf | OCTA-SHOT (one shot) | 1 page |
| DIESEL PERFORMANCE IMPROVER.pdf | OCTA-TORQUE, the site's diesel improver | 2 pages |

The first two mappings were explicitly confirmed. The diesel mapping follows
the existing product catalogue. The user also confirmed that the supplied
BOOST table replaces the previous website ratios. Accordingly the website,
label artwork, product metadata and information page now show 5L additive per
30/25/20/15L of base fuel (1:6, 1:5, 1:4, 1:3).

Technical table values and benefits were retained. Decimal commas were
normalised to decimal points, units formatted consistently, and the source's
obvious spelling error 'octane valve' corrected to 'octane value'. Reported
octane-increase values have no stated units or test methods; the PDFs disclose
this and do not invent RON/AKI units, testing certificates or guarantees.
Technical properties and performance claims have not been independently tested.

Company registration 2026/667453/07 was read from the supplied FNB account
confirmation. That confidential letter is not published or embedded in the
technical sheets. The public outputs contain no banking information.

ETHANOL.pdf and METHANOL.pdf were referenced but not supplied at the named
Downloads location. No technical sheet or safety classification was invented
for those products. Supply the matching documents to create OCTA-X and OCTA-M
editions. Approved current SDS documents are a separate requirement before
handling/supplying the chemicals; a TDS is not a substitute.

## Editing and rebuilding

- Authored technical content: `src/data/technical-sheets.json`.
- Website manifest/components: `src/lib/technicalSheets.ts` and
  `src/components/TechnicalDataSheets.tsx`.
- Document generator: `scripts/generate-data-sheets.py`.
- Final editable-workflow outputs: `output/pdf/`.
- Website copies and preview thumbnails: `public/data-sheets/`.
- Temporary renders/extraction: ignored `tmp/pdfs/` (never deployed).

To rebuild manually, run `node scripts/gen-product-assets.mjs`, then run the
Python generator using Python with reportlab, pypdf, Pillow and pypdfium2. It
currently embeds installed Windows Arial/Arial Narrow fonts; configure valid
font paths when running elsewhere. The script reopens every written PDF,
checks its table content, page count, author and absence of old branding or
attachments, and renders every page for visual inspection. Inspect every
latest render before replacing the public copies.

Hosting builds use the committed public PDFs and do not need Python. When
technical content, product names or the embedded label artwork changes,
regenerate and review the PDFs and previews together. Also update the dosage
wording/label rows in `src/lib/products.ts` and the information-page FAQ when
the corresponding approved instructions change.
