from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1]
preview = root / 'tmp' / 'pdfs' / 'backoffice'
preview.mkdir(parents=True, exist_ok=True)
tiles=[]
for kind in ('invoice','quote','statement','price-list'):
    path=root/'output'/'pdf'/f'octa-demo-{kind}.pdf'
    reader=PdfReader(path)
    text='\n'.join(page.extract_text() for page in reader.pages)
    assert 'DEMO / SAMPLE DOCUMENT - NOT FOR PAYMENT' in text
    assert 'accounts@' in text
    assert 'unitCost' not in text and 'Cost of goods' not in text
    doc=pdfium.PdfDocument(path)
    for number in range(len(doc)):
        image=doc[number].render(scale=1.3).to_pil().convert('RGB')
        image.save(preview/f'{kind}-{number+1}.png')
        image.thumbnail((480,680))
        tile=Image.new('RGB',(500,720),'#dedbd2')
        tile.paste(image,((500-image.width)//2,28))
        ImageDraw.Draw(tile).text((12,8),f'{kind} / {number+1}',fill='black')
        tiles.append(tile)
    print(f'{kind}: {len(reader.pages)} pages, sample marker and private-cost checks pass')
montage=Image.new('RGB',(1000,720*((len(tiles)+1)//2)),'white')
for i,tile in enumerate(tiles):montage.paste(tile,((i%2)*500,(i//2)*720))
montage.save(preview/'montage.png')
