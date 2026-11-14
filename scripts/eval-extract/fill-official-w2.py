# Fills Copy B (page 4) of the official 2026 IRS Form W-2 (https://www.irs.gov/pub/irs-pdf/fw2.pdf) with
# Jordan's fictional W-2 from lib/demo.ts coupleJanuary(), flattens the form fields into the page and overlays a
# "SAMPLE - fictional data" watermark. SSN and EIN are invalid on purpose; names and addresses are made up.
# Usage (needs pypdf + reportlab in a venv):
#   curl -o /tmp/fw2.pdf https://www.irs.gov/pub/irs-pdf/fw2.pdf
#   python fill-official-w2.py /tmp/fw2.pdf fixtures/official_w2_jordan.pdf
import io, sys
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color

src, out = sys.argv[1], sys.argv[2]
r = PdfReader(src)
w = PdfWriter()
w.append(r, pages=[3])  # Copy B only
# Drop XFA so the AcroForm fields are what renders.
af = w._root_object["/AcroForm"]
if "/XFA" in af:
    del af["/XFA"]

# Widget names of the top form on the Copy B page (topmostSubform[0].CopyB[0].CopyB_Top[0].*).
vals = {
    "f2_01[0]": "900-00-0001",                     # a SSN (invalid, starts with 9)
    "f2_02[0]": "00-0000001",                      # b EIN (fake)
    "f2_03[0]": "Bluebonnet Health (SAMPLE)\n100 Example Avenue\nAustin, TX 78701",  # c
    "f2_04[0]": "SAMPLE-0001",                     # d control number
    "f2_05[0]": "Jordan",                          # e first name
    "f2_06[0]": "Sample",                          # e last name
    "f2_08[0]": "200 Fictional Street\nAustin, TX 78702",  # f
    "f2_09[0]": "78000.00",   # 1
    "f2_10[0]": "5000.06",    # 2
    "f2_11[0]": "78000.00",   # 3
    "f2_12[0]": "4836.00",    # 4
    "f2_13[0]": "78000.00",   # 5
    "f2_14[0]": "1131.00",    # 6
    "f2_20[0]": "D",          # 12a code
    "f2_21[0]": "1560.00",    # 12a amount
}
page = w.pages[0]
# Field partial names are unique per page; pypdf matches on the widget's /T.
vals["c2_3[0]"] = "/1"  # box 13 retirement plan
# flatten=True renders each widget's appearance stream into the page content.
w.update_page_form_field_values(page, vals, auto_regenerate=False, flatten=True)
if "/Annots" in page:
    del page["/Annots"]
if "/AcroForm" in w._root_object:
    del w._root_object["/AcroForm"]

# Watermark overlay
buf = io.BytesIO()
pw, ph = float(page.mediabox.width), float(page.mediabox.height)
c = canvas.Canvas(buf, pagesize=(pw, ph))
c.setFillColor(Color(0.8, 0, 0, alpha=0.18))
c.setFont("Helvetica-Bold", 46)
for y in (ph * 0.72, ph * 0.25):
    c.saveState(); c.translate(pw / 2, y); c.rotate(18)
    c.drawCentredString(0, 0, "SAMPLE — fictional data"); c.restoreState()
c.setFillColor(Color(0.8, 0, 0, alpha=0.9)); c.setFont("Helvetica-Bold", 9)
c.drawString(36, ph - 22, "SAMPLE — fictional data. Not a real W-2. Invalid SSN/EIN. PayTrail extraction test fixture.")
c.save()
buf.seek(0)
page.merge_page(PdfReader(buf).pages[0])
w.add_metadata({"/Title": "SAMPLE - fictional data - Form W-2 Copy B test fixture"})
with open(out, "wb") as f:
    w.write(f)
print("ok", out)
