import subprocess
import struct
import os

BRAND_DIR = r"C:\Stayvoo\frontend\public\brand"
PUBLIC_DIR = r"C:\Stayvoo\frontend\public"
RESVG = r"C:\Stayvoo\scripts\brand-logo\resvg.exe"
TMP = r"C:\Stayvoo\scripts\brand-logo\_export_tmp"

os.makedirs(TMP, exist_ok=True)


def render(svg_path, out_path, w=None, h=None, background=None):
    cmd = [RESVG]
    if w:
        cmd += ["-w", str(w)]
    if h:
        cmd += ["-h", str(h)]
    if background:
        cmd += ["--background", background]
    cmd += [svg_path, out_path]
    subprocess.run(cmd, check=True)
    print("rendered", out_path)


# --- favicon frames ---
render(f"{BRAND_DIR}\\monogram-16.svg", f"{TMP}\\fav-16.png", w=16, h=16)
render(f"{BRAND_DIR}\\monogram.svg", f"{TMP}\\fav-32.png", w=32, h=32)
render(f"{BRAND_DIR}\\monogram.svg", f"{TMP}\\fav-48.png", w=48, h=48)

# --- app icons ---
render(f"{BRAND_DIR}\\monogram.svg", f"{PUBLIC_DIR}\\apple-touch-icon.png", w=180, h=180)
render(f"{BRAND_DIR}\\monogram.svg", f"{PUBLIC_DIR}\\icon-192.png", w=192, h=192)
render(f"{BRAND_DIR}\\monogram.svg", f"{PUBLIC_DIR}\\icon-512.png", w=512, h=512)

# --- transparent PNGs of full lockup + monogram at 512/1024 ---
render(f"{BRAND_DIR}\\logo-full.svg", f"{BRAND_DIR}\\logo-full-512.png", w=512)
render(f"{BRAND_DIR}\\logo-full.svg", f"{BRAND_DIR}\\logo-full-1024.png", w=1024)
render(f"{BRAND_DIR}\\monogram.svg", f"{BRAND_DIR}\\monogram-512.png", w=512, h=512)
render(f"{BRAND_DIR}\\monogram.svg", f"{BRAND_DIR}\\monogram-1024.png", w=1024, h=1024)

# --- email lockup: full lockup on paper/white background, 400px wide ---
render(f"{BRAND_DIR}\\logo-full.svg", f"{BRAND_DIR}\\logo-email.png", w=400, background="#F8FAFD")


# --- pack favicon.ico (16/32/48) ---
def make_ico(frames, out_path):
    entries = []
    blobs = []
    offset = 6 + 16 * len(frames)
    for size, fname in frames:
        with open(fname, "rb") as f:
            blob = f.read()
        blobs.append(blob)
        wv = 0 if size >= 256 else size
        hv = 0 if size >= 256 else size
        entries.append(struct.pack("<BBBBHHII", wv, hv, 0, 0, 1, 32, len(blob), offset))
        offset += len(blob)
    with open(out_path, "wb") as f:
        f.write(struct.pack("<HHH", 0, 1, len(frames)))
        for e in entries:
            f.write(e)
        for b in blobs:
            f.write(b)
    print("wrote", out_path)


make_ico(
    [(16, f"{TMP}\\fav-16.png"), (32, f"{TMP}\\fav-32.png"), (48, f"{TMP}\\fav-48.png")],
    f"{PUBLIC_DIR}\\favicon.ico",
)

print("done")
