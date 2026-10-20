"""Build the one-page product brochures from src/data/brochures.json.

Same tooling and brand as generate-data-sheets.py (reportlab, pypdf, pypdfium2,
Pillow). Each brochure carries a QR code that opens the product's technical
data sheet. The PDFs in public/brochures are committed assets; hosting builds
do not need Python. Run manually after editing the brochure text.
"""
from pathlib import Path
import json, re
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from pypdf import PdfReader
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'src/data/brochures.json').read_text(encoding='utf-8'))
SHEETS = {s['slug'] for s in json.loads((ROOT / 'src/data/technical-sheets.json').read_text(encoding='utf-8'))}
SITE = 'https://octa-boost.com'
PHONE, EMAIL = '+27 64 507 3615', 'info@octa-boost.com'
EDITION = '20 October 2026'
PUBLIC = ROOT / 'public/brochures'
PROOF = ROOT / 'tmp/pdfs/brochures'
for folder in (PUBLIC, PROOF):
    folder.mkdir(parents=True, exist_ok=True)

for name, file in [('Body', 'arial.ttf'), ('Bold', 'arialbd.ttf'), ('Display', 'ARIALNB.TTF')]:
    path = Path('C:/Windows/Fonts') / file
    if not path.exists():
        raise RuntimeError(f'Configure an installed TrueType font for {name}.')
    pdfmetrics.registerFont(TTFont(name, str(path)))

INK, PAPER, LIME, RED = map(HexColor, ['#191817', '#f2efe6', '#c6f24e', '#d52200'])
MUTED, LINE, WHITE = map(HexColor, ['#625f56', '#d8d4ca', '#fffefa'])
W, H, M = 595.276, 841.89, 38
CW = W - M * 2
BAND = 168  # top of the dark contact band

def sheet_url(slug):
    return f'{SITE}/data-sheets/{slug}-technical-data-sheet.pdf'

def paragraph(c, text, x, top, width, size=10, leading=14, color=INK, font='Body'):
    p = Paragraph(escape(text), ParagraphStyle('p', fontName=font, fontSize=size, leading=leading, textColor=color))
    _, height = p.wrap(width, H)
    p.drawOn(c, x, top - height)
    return top - height

def label(c, text, x, y, color=MUTED, size=8):
    c.setFillColor(color); c.setFont('Bold', size); c.drawString(x, y, text.upper())

def section(c, number, title, x, top):
    c.setFillColor(LIME); c.rect(x, top - 17, 25, 19, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont('Display', 11); c.drawString(x + 5, top - 12, number)
    c.setFont('Display', 14); c.drawString(x + 36, top - 12, title.upper())
    return top - 28

def bullets(c, items, x, top, width, size=9.6, leading=13):
    for item in items:
        c.setFillColor(RED); c.rect(x, top - 7, 3.5, 3.5, stroke=0, fill=1)
        top = paragraph(c, item, x + 12, top, width - 12, size, leading) - 6
    return top

def qr(c, url, x, y, size):
    widget = QrCodeWidget(url, barLevel='M')
    x0, y0, x1, y1 = widget.getBounds()
    d = Drawing(size, size, transform=[size / (x1 - x0), 0, 0, size / (y1 - y0), 0, 0])
    d.add(widget)
    renderPDF.draw(d, c, x, y)

def dosage_table(c, b, top):
    t = b['table']
    head = ParagraphStyle('head', fontName='Bold', fontSize=8.2, leading=11, textColor=PAPER)
    cell = ParagraphStyle('cell', fontName='Body', fontSize=9.6, leading=12, textColor=INK)
    rows = [[Paragraph(escape(s), head) for s in t['columns']]] + [[Paragraph(escape(s), cell) for s in r] for r in t['rows']]
    table = Table(rows, colWidths=[CW / len(t['columns'])] * len(t['columns']))
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), INK), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, PAPER]), ('LINEBELOW', (0, 1), (-1, -1), .35, LINE), ('BOX', (0, 0), (-1, -1), .8, INK),
    ]))
    _, height = table.wrap(CW, H)
    table.drawOn(c, M, top - height)
    return top - height

def contact_band(c, b):
    c.setFillColor(INK); c.rect(0, 30, W, BAND - 30, fill=1, stroke=0)
    c.setFillColor(LIME); c.rect(0, BAND - 4, W, 4, fill=1, stroke=0)
    # Order and sales
    top = BAND - 26
    label(c, 'Order & sales', M, top, LIME)
    c.setFillColor(WHITE); c.setFont('Display', 17)
    c.drawString(M, top - 22, PHONE)
    c.setFont('Body', 9.5); c.setFillColor(PAPER)
    c.drawString(M, top - 38, EMAIL)
    c.drawString(M, top - 51, 'octa-boost.com/shop')
    c.setFont('Body', 8); c.setFillColor(HexColor('#bdb9ae'))
    c.drawString(M, top - 67, 'Collect for free, or local delivery on bigger orders.')
    c.drawString(M, top - 78, 'Courier quoted on request.')
    # Become an agent
    ax = M + 188
    label(c, 'Become an agent', ax, top, LIME)
    c.setFillColor(WHITE); c.setFont('Display', 15)
    c.drawString(ax, top - 21, 'Sell OCTA in your area')
    paragraph(c, 'Workshops, tuners and fuel resellers: apply online for agent pricing and stock.', ax, top - 30, 170, 8.6, 11.5, PAPER)
    c.setFillColor(LIME); c.setFont('Bold', 9); c.drawString(ax, top - 78, 'octa-boost.com/agents')
    # QR code to the data sheet
    size = 84
    qx, qy = W - M - size, BAND - 18 - size
    c.setFillColor(WHITE); c.rect(qx - 6, qy - 6, size + 12, size + 12, fill=1, stroke=0)
    qr(c, sheet_url(b['slug']), qx, qy, size)
    c.setFillColor(PAPER); c.setFont('Bold', 7.2)
    c.drawCentredString(qx + size / 2, qy - 15, 'SCAN FOR THE')
    c.drawCentredString(qx + size / 2, qy - 24, 'TECHNICAL DATA SHEET')

def footer(c):
    c.setFillColor(PAPER); c.rect(0, 0, W, 30, fill=1, stroke=0)
    c.setFont('Body', 7); c.setFillColor(MUTED)
    c.drawString(M, 12, f'ZRG-X (PTY) LTD / OCTA Performance  |  Reg. 2026/667453/07  |  Brochure edition: {EDITION}')
    c.drawRightString(W - M, 12, 'Product information, not a Safety Data Sheet (SDS).')

def create(b):
    if b['slug'] not in SHEETS:
        raise RuntimeError(f"No data sheet for {b['slug']}: brochures are only made for products with one.")
    target = PUBLIC / f"{b['slug']}-brochure.pdf"
    c = canvas.Canvas(str(target), pagesize=(W, H), pageCompression=1, invariant=1)
    c.setTitle(f"{b['name']} | Product brochure"); c.setAuthor('ZRG-X (PTY) LTD / OCTA Performance')
    c.setSubject(f"{b['name']}: uses, benefits, dosage and how to order"); c.setCreator('OCTA Performance document studio')
    c.setFillColor(PAPER); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(LIME); c.rect(0, H - 9, W, 9, stroke=0, fill=1)
    c.drawImage(str(ROOT / 'public/og/logo.png'), M, H - 79, width=133, height=46, mask='auto', preserveAspectRatio=True)
    label(c, 'Product brochure', W - 187, H - 43)
    label(c, 'OCTA / ZRG-X', W - 187, H - 59, INK)
    c.setStrokeColor(INK); c.setLineWidth(1); c.line(M, H - 95, W - M, H - 95)

    # Title block, with the product picture on a lime panel to the right.
    pic = 196
    px, ptop = W - M - pic, H - 110
    c.setFillColor(LIME); c.rect(px, ptop - pic, pic, pic, fill=1, stroke=0)
    c.drawImage(str(ROOT / f"public/products/{b['slug']}.png"), px + 8, ptop - pic + 8, width=pic - 16, height=pic - 16, mask='auto', preserveAspectRatio=True)
    left = CW - pic - 22
    label(c, b['kicker'], M, H - 121, RED)
    c.setFillColor(INK); c.setFont('Display', 44 if len(b['name']) <= 9 else 38); c.drawString(M, H - 166, b['name'])
    top = paragraph(c, b['headline'], M, H - 178, left, 14, 18, INK, 'Bold') - 10
    label(c, 'Sizes', M, top - 8); c.setFont('Body', 9.5); c.setFillColor(INK); c.drawString(M + 36, top - 8, b['sizes'])
    top = section(c, '01', "What it's for", M, top - 24)
    top = bullets(c, b['usedFor'], M, top, left)
    top = min(top, ptop - pic) - 14

    # Why OCTA and the pros, side by side.
    half = (CW - 22) / 2
    a = section(c, '02', 'Why OCTA', M, top)
    a = bullets(c, b['why'], M, a, half, 9.2, 12.4)
    p = section(c, '03', 'Pros', M + half + 22, top)
    p = bullets(c, b['pros'], M + half + 22, p, half, 9.2, 12.4)
    top = min(a, p) - 8

    # Dosage / dilution.
    top = section(c, '04', b['dosageTitle'], M, top)
    if 'table' in b:
        top = dosage_table(c, b, top) - 8
    elif 'highlight' in b:
        c.setFillColor(LIME); c.rect(M, top - 40, CW, 40, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont('Display', 20); c.drawString(M + 14, top - 27, b['highlight'])
        top -= 50
    top = paragraph(c, b['dosage'], M, top, CW, 9.2, 12.6) - 5
    top = paragraph(c, b['safety'], M, top, CW, 8.2, 11, MUTED)
    if top < BAND + 10:
        raise RuntimeError(f"Content overlaps the contact band: {b['slug']} ({top:.1f})")

    contact_band(c, b)
    footer(c)
    c.showPage(); c.save()

    # Reopen, check the text and render a proof.
    reader = PdfReader(target)
    assert len(reader.pages) == 1, target
    text = ' '.join(reader.pages[0].extract_text().split())
    for must in [b['name'], PHONE, EMAIL, 'octa-boost.com/agents', 'TECHNICAL DATA SHEET', 'ZRG-X (PTY) LTD']:
        assert must in text, f"{b['slug']}: missing {must}"
    for item in b['usedFor'] + b['why'] + b['pros']:
        assert ' '.join(item.split()) in text, f"{b['slug']}: missing {item}"
    assert not re.search(r'AMTEC|SASOL|Chemi|Liquid Energy', text, re.I), 'no supplier names'
    doc = pdfium.PdfDocument(str(target))
    im = doc[0].render(scale=2).to_pil().convert('RGB')
    im.save(PROOF / f"{b['slug']}.png")
    print(f"Created and verified {target.name}: {target.stat().st_size} bytes, content ends at {top:.1f}pt (band at {BAND})")

for brochure in DATA:
    create(brochure)
