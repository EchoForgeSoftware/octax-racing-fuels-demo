"""Package reviewed high-resolution landscape artwork and available data sheets."""
from pathlib import Path
import json, shutil, zipfile
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader,PdfWriter
from PIL import Image
import pypdfium2 as pdfium

ROOT=Path(__file__).resolve().parent.parent
PACK=ROOT/'output/brand-pack';PDF=ROOT/'output/pdf';PROOF=ROOT/'tmp/pdfs/brand-pack'
for folder in (PDF,PROOF,PACK/'data-sheets'):
    folder.mkdir(parents=True,exist_ok=True)
manifest=json.loads((PACK/'manifest.json').read_text())
width=841.89;height=width*3750/6000
labels=PDF/'octa-landscape-labels.pdf'
c=canvas.Canvas(str(labels),pagesize=(width,height),pageCompression=1,invariant=1)
c.setTitle('OCTA Performance | Landscape label artwork')
c.setAuthor('ZRG-X (PTY) LTD / OCTA Performance')
c.setSubject('Landscape artwork masters; resize and complete supplier/SDS information before production')
for item in manifest:
    path=PACK/item['label']
    with Image.open(path) as image:
        assert image.size==(6000,3750)
        c.bookmarkPage(item['slug']);c.addOutlineEntry(item['name'],item['slug'])
        c.drawImage(ImageReader(image),0,0,width=width,height=height)
    c.showPage()
c.save()
reader=PdfReader(labels)
assert len(reader.pages)==len(manifest) and all(float(p.mediabox.width)>float(p.mediabox.height) for p in reader.pages)
assert not reader.attachments
for p in reader.pages:
    images=list(p.images)
    assert images and images[0].image.size==(6000,3750)
writer=PdfWriter()
sheets=[]
for item in manifest:
    source=ROOT/f"public/data-sheets/{item['slug']}-technical-data-sheet.pdf"
    if not source.exists():continue  # e.g. OCTA-X 95%: no data sheet supplied yet
    sheets.append(source)
    writer.append(str(source),outline_item=item['name'])
    shutil.copyfile(source,PACK/'data-sheets'/source.name)
writer.add_metadata({'/Title':'OCTA Performance | Available technical data sheets','/Author':'ZRG-X (PTY) LTD / OCTA Performance'})
data=PDF/'octa-all-available-data-sheets.pdf'
with data.open('wb') as stream:writer.write(stream)
assert len(PdfReader(data).pages)==sum(len(PdfReader(x).pages) for x in sheets)
for source in [labels,data]:
    shutil.copyfile(source,PACK/source.name)
    doc=pdfium.PdfDocument(str(source))
    for index,page in enumerate(doc):
        page.render(scale=1.4).to_pil().save(PROOF/f'{source.stem}-{index+1}.png')
readme='''OCTA PERFORMANCE / ZRG-X (PTY) LTD

CONTENTS
- octa-all-available-data-sheets.pdf: OCTA-X Plus, OCTA-M, BOOST, SHOT and TORQUE (6 pages).
- octa-landscape-labels.pdf: all 6 landscape label masters, one per page
  (OCTA-X 95%, OCTA-X Plus 96%, OCTA-M, BOOST, SHOT, TORQUE).
- data-sheets/: the individual technical PDFs. OCTA-X 95% has none yet.
- labels/: 6000 x 3750 PNGs (600 dpi metadata) and editable SVG artwork.
- product-images/: 4000 x 4000 PNG illustrations of all 10 catalogue packs,
  including the 210L ethanol and methanol drums. These are illustrations,
  not product photographs. Mockups retain the website's portrait labels;
  separate landscape masters are included for the printer to apply/resize.
- logos/: OCTA vector/2400px PNG and the original supplied ZRG-X PNG.

PRINTING
Landscape artwork is supplied for your printer to size. A PNG's dpi metadata
does not establish the final physical size. Larger prints reduce effective
resolution; use the SVG master where practical. Fonts use Arial/Arial Narrow
fallbacks, so have the printer proof the SVG before output. Label PDFs embed
the full 6000px raster artwork; they are not vector PDF masters. Colours are
sRGB, not printer-specific CMYK. No final dimensions, bleed or cut lines have
been invented. Choose suitable stock/adhesive for the container and chemicals.

Every label carries OCTA's contact line: +27 64 507 3615,
info@octa-boost.com and octa-boost.com. The traceability and net-content
boxes are left blank to fill in per pack. Obtain approval of the safety,
hazard and transport information against the current product SDS before
production. These artwork masters do not establish GHS/SDS compliance.
The source label wording has been retained; it has not received legal or
chemical-safety certification through this artwork export.

DATA SHEETS
These are technical data sheets, not SDS documents. All five products now have
a sheet: OCTA-X (from ETHANOL.pdf) and OCTA-M (from METHANOL.pdf) were added on
17 October 2026. No missing chemical data or test certification has been
invented. BOOST's supplied dosage table replaces the old website ratios as
confirmed by the user on 16 October 2026. Current SDS documents are still
required before handling or supplying the chemicals.
'''
(PACK/'READ-ME.txt').write_text(readme,encoding='utf-8')
archive=ROOT/'output/OCTA-brand-pack.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for path in sorted(PACK.rglob('*')):
        if path.is_file():z.write(path,path.relative_to(PACK))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len([name for name in z.namelist() if name.startswith('labels/') and name.endswith('.png')])==len(manifest)
    assert len([name for name in z.namelist() if name.startswith('product-images/') and name.endswith('.png')])==sum(len(i['variants']) for i in manifest)
print(f'Verified {len(manifest)} landscape labels, {len(sheets)} data sheets, {sum(len(i["variants"]) for i in manifest)} product images. ZIP: {archive.stat().st_size:,} bytes')
