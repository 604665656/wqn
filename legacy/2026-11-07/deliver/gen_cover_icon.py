from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 900

# ---------- background: dark warm ink/bronze gradient ----------
base = Image.new("RGB", (W, H), (18, 15, 12))
d = ImageDraw.Draw(base)
for y in range(H):
    t = y / (H - 1)
    r = int(16 + t * 28)
    g = int(14 + t * 22)
    b = int(12 + t * 15)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# soft warm glow behind title
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse([W * 0.18, H * 0.10, W * 0.82, H * 0.66], fill=70)
glow = glow.filter(ImageFilter.GaussianBlur(150))
base = Image.composite(Image.new("RGB", (W, H), (66, 52, 34)), base, glow)
d = ImageDraw.Draw(base)

gold = (203, 170, 108)
gold_dim = (140, 116, 78)
cream = (242, 232, 213)
muted = (150, 138, 120)

# ---------- ornamental double frame ----------
d.rectangle([56, 56, W - 56, H - 56], outline=(92, 76, 52), width=2)
d.rectangle([74, 74, W - 74, H - 74], outline=(58, 48, 36), width=1)
# corner ticks
cl = 46
for cx, cy, sx, sy in [(74, 74, 1, 1), (W - 74, 74, -1, 1), (74, H - 74, 1, -1), (W - 74, H - 74, -1, -1)]:
    d.line([(cx, cy), (cx + sx * cl, cy)], fill=gold_dim, width=2)
    d.line([(cx, cy), (cx, cy + sy * cl)], fill=gold_dim, width=2)


def font(size, bold=False):
    path = "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"
    return ImageFont.truetype(path, size)


# ---------- title ----------
d.text((W / 2, 300), "上下五千年", font=font(158, True), fill=cream, anchor="mm")
d.text((W / 2, 452), "无 尽 编 年", font=font(74, True), fill=gold, anchor="mm")

# divider with center diamond
d.line([(W / 2 - 250, 548), (W / 2 - 22, 548)], fill=gold_dim, width=2)
d.line([(W / 2 + 22, 548), (W / 2 + 250, 548)], fill=gold_dim, width=2)
d.polygon([(W / 2, 538), (W / 2 + 10, 548), (W / 2, 558), (W / 2 - 10, 548)], fill=gold)

d.text((W / 2, 622), "横 跨 五 千 年 的 文 明 推 演", font=font(33), fill=muted, anchor="mm")

# ---------- small red seal (bottom center) ----------
seal = 74
sx, sy = W / 2 - seal / 2, 700
d.rounded_rectangle([sx, sy, sx + seal, sy + seal], radius=10, fill=(150, 44, 38))
d.text((sx + seal / 2, sy + seal / 2 + 2), "史", font=font(46, True), fill=(240, 224, 205), anchor="mm")

base.save(r"C:\Users\60466\WorkBuddy\2026-11-07-09-21-08\wqn\deliver\cover_v2.png", quality=95)
print("cover_v2 saved", base.size)

# ---------- icon 512x512 ----------
S = 512
ic = Image.new("RGB", (S, S), (20, 17, 13))
di = ImageDraw.Draw(ic)
for y in range(S):
    t = y / (S - 1)
    r = int(20 + t * 26)
    g = int(17 + t * 20)
    b = int(13 + t * 12)
    di.line([(0, y), (S, y)], fill=(r, g, b))
ic = ic.filter(ImageFilter.GaussianBlur(0))
di = ImageDraw.Draw(ic)
di.rounded_rectangle([18, 18, S - 18, S - 18], radius=28, outline=(203, 170, 108), width=4)
di.rounded_rectangle([34, 34, S - 34, S - 34], radius=20, outline=(120, 98, 66), width=2)
di.text((S / 2, S / 2 - 8), "史", font=font(250, True), fill=gold, anchor="mm")
di.text((S / 2, S - 92), "无 尽 编 年", font=font(38, True), fill=(214, 198, 170), anchor="mm")
ic.save(r"C:\Users\60466\WorkBuddy\2026-11-07-09-21-08\wqn\deliver\icon_v2.png", quality=95)
print("icon_v2 saved", ic.size)
