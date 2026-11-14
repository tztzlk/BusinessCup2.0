# Turns a rendered page PNG into a phone-photo-like image: crop to the top form, slight rotation,
# uneven lighting, warm tint, blur and sensor noise. Usage:
#   pdftoppm -r 165 -png -singlefile fixtures/official_w2_jordan.pdf /tmp/w2_page
#   python photo-like.py /tmp/w2_page.png fixtures/official_w2_jordan_photo.png
import sys, random
from PIL import Image, ImageFilter, ImageChops, ImageDraw
random.seed(7)
im = Image.open(sys.argv[1]).convert("RGB")
W, H = im.size
im = im.crop((0, 0, W, int(H * 0.52)))  # top W-2 (Copy B) plus the header line; like a photo of one form
# paper on a darker desk, rotated ~1.8 degrees
pad = 60
bg = Image.new("RGB", (im.width + 2 * pad, im.height + 2 * pad), (92, 84, 76))
bg.paste(im, (pad, pad))
bg = bg.rotate(-1.8, resample=Image.BICUBIC, expand=False, fillcolor=(92, 84, 76))
# uneven lighting: radial-ish gradient darker toward bottom-right
grad = Image.new("L", bg.size, 0)
d = ImageDraw.Draw(grad)
for i in range(0, bg.width + bg.height, 8):
    v = int(255 - 70 * i / (bg.width + bg.height))
    d.line([(i, 0), (0, i)], fill=v, width=9)
light = Image.merge("RGB", (grad, grad, grad.point(lambda x: int(x * 0.93))))
bg = ImageChops.multiply(bg, light)
bg = bg.filter(ImageFilter.GaussianBlur(0.7))
noise = Image.effect_noise(bg.size, 18).convert("RGB")
bg = Image.blend(bg, ImageChops.multiply(bg, noise.point(lambda x: 200 + x // 5)), 0.35)
bg = bg.resize((1400, int(bg.height * 1400 / bg.width)), Image.LANCZOS)
bg.save(sys.argv[2], optimize=True)
print(bg.size)
