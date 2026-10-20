"""Rebuild the branded TDS files from authored data and existing website artwork.

Run manually with Python + reportlab/pypdf/Pillow/pypdfium2 after generating the
website product artwork. The PDFs in public/data-sheets are committed assets;
hosting builds do not require Python. Originals are never embedded or copied.
"""
from pathlib import Path
from io import BytesIO
import json, shutil, re
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader
from PIL import Image
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'src/data/technical-sheets.json').read_text(encoding='utf-8'))
OUT = ROOT / 'output/pdf'
PUBLIC = ROOT / 'public/data-sheets'
PROOF = ROOT / 'tmp/pdfs/branded'
for folder in (OUT, PUBLIC, PROOF):
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

def paragraph(c, text, x, top, width, size=10.1, leading=14.5, color=INK, font='Body'):
    style = ParagraphStyle('p', fontName=font, fontSize=size, leading=leading, textColor=color)
    p = Paragraph(escape(text), style)
    _, height = p.wrap(width, H)
    p.drawOn(c, x, top - height)
    return top - height

def label(c, text, x, y, color=MUTED):
    c.setFillColor(color); c.setFont('Bold', 8)
    c.drawString(x, y, text.upper())

def section(c, number, title, top):
    c.setFillColor(LIME); c.rect(M, top - 17, 25, 19, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont('Display', 11); c.drawString(M + 5, top - 12, number)
    c.setFont('Display', 14); c.drawString(M + 36, top - 12, title.upper())
    return top - 32

def dots(c, x, top, cols=11, rows=7, color=LIME):
    c.setFillColor(color)
    for col in range(cols):
        for row in range(rows):
            if (col + row) % 2 == 0:
                c.circle(x + col * 7, top - row * 7, max(.35, 1.8 - col * .11), fill=1, stroke=0)

def table(c, sheet, top, compact=False, spec=False):
    cols = sheet['columns']
    widths = ([211, 65, 145, CW-421] if sheet['slug'] == 'octa-torque' else
              [175, 62, 115, CW-352] if cols[0] == 'Property' else
              [120, 145, CW-265] if len(cols) == 3 else [120, 145, (CW-265)/2, (CW-265)/2])
    size = 9.6 if spec else 9.2 if compact else 11
    style = ParagraphStyle('cell', fontName='Body', fontSize=size, leading=size + 2.8, textColor=INK)
    head = ParagraphStyle('head', fontName='Bold', fontSize=8.2, leading=11, textColor=PAPER)
    cells = [[Paragraph(escape(s), head) for s in cols]]
    cells += [[Paragraph(escape(s), style) for s in row] for row in sheet['rows']]
    t = Table(cells, colWidths=widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INK), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 5 if spec else 4 if compact else 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5 if spec else 4 if compact else 10),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, PAPER]),
        ('LINEBELOW', (0,1), (-1,-1), .35, LINE),
        ('BOX', (0,0), (-1,-1), .8, INK)
    ]))
    _, height = t.wrap(CW, H)
    t.drawOn(c, M, top-height)
    return top-height

def bullet(c, text, x, top, width, size=10, leading=14):
    c.setFillColor(RED); c.rect(x, top-7, 3, 3, stroke=0, fill=1)
    return paragraph(c, text, x+12, top, width-12, size, leading) - 9

def header(c, sheet):
    c.setFillColor(PAPER); c.rect(0,0,W,H,stroke=0,fill=1)
    c.setFillColor(LIME); c.rect(0,H-9,W,9,stroke=0,fill=1)
    c.drawImage(str(ROOT/'public/og/logo.png'), M, H-79, width=133, height=46, mask='auto', preserveAspectRatio=True)
    label(c, 'Technical data sheet', W-187, H-43)
    label(c, 'OCTA / ZRG-X', W-187, H-59, INK)
    c.setStrokeColor(INK); c.setLineWidth(1); c.line(M,H-95,W-M,H-95)
    label(c, sheet['category'], M, H-119, RED)
    c.setFillColor(INK); c.setFont('Display', 43); c.drawString(M,H-167,sheet['name'])
    c.setFont('Body', 11); c.drawString(M,H-190,sheet['strapline'])
    dots(c, W-132,H-121,10,8)
    return H-220

def footer(c, sheet, page=1):
    c.setStrokeColor(INK); c.setLineWidth(1); c.line(M,87,W-M,87)
    # Composite white onto the page paper while preserving the exact logo art.
    c.saveState()
    c.setBlendMode('Multiply')
    c.drawImage(str(ROOT/'src/assets/zrg-x-logo.png'), M, 39, width=100, height=42, mask='auto', preserveAspectRatio=True)
    c.restoreState()
    label(c, 'ZRG-X (PTY) LTD / OCTA PERFORMANCE', M+117, 68, INK)
    c.setFont('Body', 7.4); c.setFillColor(MUTED)
    y, mo, d = sheet['edition'].split('-'); edition = f"{int(d)} {['January','February','March','April','May','June','July','August','September','October','November','December'][int(mo)-1]} {y}"
    c.drawString(M+117,54,f'Reg. 2026/667453/07  |  Brand edition: {edition}')
    c.drawString(M+117,42,'Technical information. Not a Safety Data Sheet (SDS).')
    c.setFont('Body',7.3); c.drawString(M,22,'Consult the current SDS before handling. Follow the approved product instructions.')
    c.setFont('Bold',7.3); c.drawRightString(W-M,22,f"{page:02d} / {sheet['pages']:02d}")

def create(sheet):
    target = OUT/f"{sheet['slug']}-technical-data-sheet.pdf"
    c = canvas.Canvas(str(target), pagesize=(W,H), pageCompression=1, invariant=1)
    c.setTitle(f"{sheet['name']} | Technical Data Sheet")
    c.setAuthor('ZRG-X (PTY) LTD / OCTA Performance')
    c.setSubject(f"{sheet['name']} technical properties and application data")
    c.setCreator('OCTA Performance document studio')
    top = header(c,sheet)
    if sheet['slug'] == 'octa-torque':
        top = section(c,'01','Application and dosage',top)
        top = paragraph(c,sheet['description'],M,top,CW,9.5,13)-14
        top = section(c,'02',sheet['tableTitle'],top)
        top = table(c,sheet,top,True)-17
        top=paragraph(c,sheet['notes'][0],M,top,CW,9,13,MUTED)
        assert top > 101
        footer(c,sheet,1);c.showPage()
        top=header(c,sheet)
        top=section(c,'03','Performance benefits',top)
        for item in sheet['benefits']:
            top=bullet(c,item,M,top,CW,10.1,14.5)
        top-=14
        c.setFillColor(LIME);c.rect(M,top-75,CW,75,fill=1,stroke=0)
        label(c,'Recommended dosage',M+16,top-23,INK)
        c.setFillColor(INK);c.setFont('Display',25)
        c.drawString(M+16,top-54,'0.50% / 5 L per 1000 L of diesel')
        top-=90
    else:
        top=section(c,'01','Product profile',top)
        top=paragraph(c,sheet['description'],M,top,CW-170,11,16)-15
        # Reuse the actual website product artwork; no supplier assets are used.
        c.drawImage(str(ROOT/f"public/products/{sheet['slug']}.png"),W-M-145,top-100,width=145,height=145,mask='auto')
        image_bottom=top-100
        # Specification-only sheets (OCTA-X, OCTA-M) have no benefits list in the source.
        if sheet['benefits']:
            label(c,'Benefits',M,top)
            top-=15
            for benefit in sheet['benefits']:
                top=bullet(c,benefit,M,top,CW-170,10,14)
        # Specification sheets start their (longer) table just below the product picture.
        spec=not sheet['benefits']
        top=min(top-17,image_bottom-17) if spec else min(top-17,H-428)
        top=section(c,'02',sheet['tableTitle'],top)
        top=table(c,sheet,top,compact=spec,spec=spec)-17
        for note in sheet['notes']:
            top=paragraph(c,note,M,top,CW,8.2 if spec else 8.6,11.4 if spec else 12,MUTED)-(6 if spec else 8)
    if top < 101:
        raise RuntimeError(f"Content overlaps footer: {sheet['slug']} ({top})")
    footer(c,sheet,sheet['pages'])
    c.showPage();c.save()
    # Reopen the actual artifact, verify metadata/content, and render for review.
    reader=PdfReader(target)
    assert len(reader.pages)==sheet['pages'], target
    text='\n'.join(page.extract_text() for page in reader.pages)
    assert sheet['name'] in text and 'ZRG-X (PTY) LTD' in text
    assert not re.search(r'AMTEC|SASOL|AOB\s*235|C6\s+OCTANE|Racing Fuels.*Lubricants',text,re.I)
    assert reader.metadata.author=='ZRG-X (PTY) LTD / OCTA Performance'
    assert not reader.attachments
    for row in sheet['rows']:
        for cell in row:
            assert cell in text, f'Missing table cell {cell}'
    normalise=lambda value: ' '.join(value.split())
    for benefit in sheet['benefits']:
        assert normalise(benefit) in normalise(text), f'Missing benefit: {benefit}'
    shutil.copyfile(target,PUBLIC/target.name)
    doc=pdfium.PdfDocument(str(target))
    for i,page in enumerate(doc):
        im=page.render(scale=1.5).to_pil().convert('RGB')
        im.save(PROOF/f"{sheet['slug']}-{i+1}.png")
    im=doc[0].render(scale=1.5).to_pil().convert('RGB')
    im.thumbnail((620,880));im.save(PUBLIC/f"{sheet['slug']}-preview.webp",quality=88)
    print(f"Created and verified {target.name}: {sheet['pages']} pages, {target.stat().st_size} bytes, content ends at {top:.1f}pt")

for sheet in DATA:
    create(sheet)
