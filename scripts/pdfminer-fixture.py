import json, sys
from pdfminer.converter import PDFPageAggregator
from pdfminer.high_level import extract_pages
from pdfminer.layout import LAParams, LTChar, LTTextBox
from pdfminer.pdfinterp import PDFPageInterpreter, PDFResourceManager
from pdfminer.pdfpage import PDFPage

src, out = sys.argv[1], sys.argv[2]
with open(src, 'rb') as fp:
    rm = PDFResourceManager()
    device = PDFPageAggregator(rm, laparams=None)
    interp = PDFPageInterpreter(rm, device)
    interp.process_page(next(PDFPage.get_pages(fp)))
    raw = device.get_result()
chars = [{'text': c.get_text(), 'x0': round(c.x0, 3), 'y0': round(c.y0, 3), 'x1': round(c.x1, 3), 'y1': round(c.y1, 3)} for c in raw if isinstance(c, LTChar)]
page = next(extract_pages(src, laparams=LAParams()))
boxes = [b.get_text().strip() for b in page if isinstance(b, LTTextBox)]
json.dump({'chars': chars, 'boxes': boxes}, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print(out, len(chars), 'chars', len(boxes), 'boxes')
