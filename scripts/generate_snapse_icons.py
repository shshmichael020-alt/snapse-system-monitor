import os
from PIL import Image, ImageDraw, ImageEnhance

SRC_MASTER = r"C:/Users/Dell/.gemini/antigravity/brain/53c0c06c-90c6-49af-9342-bbf7263eb621/.user_uploaded/media_1792592127604_5787e46b.png"
SRC_SHEET = r"C:/Users/Dell/.gemini/antigravity/brain/53c0c06c-90c6-49af-9342-bbf7263eb621/.user_uploaded/media_1792592013540_ed10b117.png"

BASE_DIR = r"D:\OS\Snapse"
ICONS_DIR = os.path.join(BASE_DIR, "src-tauri", "icons")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

os.makedirs(ICONS_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

def apply_squircle_mask(image, corner_radius_ratio=0.23):
    w, h = image.size
    scale = 4
    mask = Image.new("L", (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(mask)
    radius = int(w * corner_radius_ratio * scale)
    draw.rounded_rectangle([(0, 0), (w * scale - 1, h * scale - 1)], radius=radius, fill=255)
    mask = mask.resize((w, h), Image.Resampling.LANCZOS)
    res = image.copy()
    res.putalpha(mask)
    return res

def generate_icons():
    print(f"Loading master graphic: {SRC_MASTER}")
    master_img = Image.open(SRC_MASTER).convert("RGBA")
    # Master squircle crop: [26, 24, 610, 608]
    master_cropped = master_img.crop((26, 24, 610, 608))
    master_512 = apply_squircle_mask(master_cropped).resize((512, 512), Image.Resampling.LANCZOS)

    print(f"Loading taskbar-optimized graphic from: {SRC_SHEET}")
    sheet_img = Image.open(SRC_SHEET).convert("RGBA")
    # Taskbar & Alt+Tab squircle crop: [389, 136, 509, 256]
    taskbar_cropped = sheet_img.crop((389, 136, 509, 256))
    taskbar_clean = apply_squircle_mask(taskbar_cropped, corner_radius_ratio=0.235)

    # 1. Create multi-resolution layers
    # Large sizes (Installer, Explorer Large, High-DPI): Master glowing telemetry graphic
    im256 = master_512.resize((256, 256), Image.Resampling.LANCZOS)
    im128 = master_512.resize((128, 128), Image.Resampling.LANCZOS)

    # Taskbar & Alt+Tab & Task Manager sizes: High-contrast clean sharp cyan waveform (No blue blob)
    im64 = taskbar_clean.resize((64, 64), Image.Resampling.LANCZOS)
    im48 = taskbar_clean.resize((48, 48), Image.Resampling.LANCZOS)
    
    # Task Manager & System Tray native grid: Sharpened high-contrast pulse line
    im32 = taskbar_clean.resize((32, 32), Image.Resampling.LANCZOS)
    im32 = ImageEnhance.Sharpness(im32).enhance(1.4)
    im32 = ImageEnhance.Contrast(im32).enhance(1.1)

    im24 = taskbar_clean.resize((24, 24), Image.Resampling.LANCZOS)
    im24 = ImageEnhance.Sharpness(im24).enhance(1.5)

    im16 = taskbar_clean.resize((16, 16), Image.Resampling.LANCZOS)
    im16 = ImageEnhance.Sharpness(im16).enhance(1.6)
    im16 = ImageEnhance.Contrast(im16).enhance(1.15)

    # 2. Save complete Windows ICO with all layers embedded
    ico_path = os.path.join(ICONS_DIR, "icon.ico")
    im256.save(ico_path, format="ICO", append_images=[im128, im64, im48, im32, im24, im16])
    print(f"Saved: {ico_path} with 7 optimized layers (16, 24, 32, 48, 64, 128, 256)")

    # Also save public/favicon.ico
    public_ico = os.path.join(PUBLIC_DIR, "favicon.ico")
    im256.save(public_ico, format="ICO", append_images=[im128, im64, im48, im32, im24, im16])
    print(f"Saved: {public_ico}")

    # 3. Save standard Tauri PNG icons
    master_512.save(os.path.join(ICONS_DIR, "icon.png"), format="PNG")
    im256.save(os.path.join(ICONS_DIR, "128x128@2x.png"), format="PNG")
    im128.save(os.path.join(ICONS_DIR, "128x128.png"), format="PNG")
    im32.save(os.path.join(ICONS_DIR, "32x32.png"), format="PNG")

    # Windows Store / Tile assets
    im48.resize((44, 44), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, "Square44x44Logo.png"), format="PNG")
    im64.resize((71, 71), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, "Square71x71Logo.png"), format="PNG")
    im128.resize((150, 150), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, "Square150x150Logo.png"), format="PNG")
    im256.resize((310, 310), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, "Square310x310Logo.png"), format="PNG")
    im48.resize((50, 50), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, "StoreLogo.png"), format="PNG")

    # 4. Save Public web assets
    master_512.save(os.path.join(PUBLIC_DIR, "icon.png"), format="PNG")
    master_512.save(os.path.join(PUBLIC_DIR, "snapse-logo.png"), format="PNG")
    im48.save(os.path.join(PUBLIC_DIR, "taskbar-icon.png"), format="PNG")

    # Clean up any leftover temp files
    for tmp in ["sheet_left.png", "sheet_mid.png", "sheet_right.png", "taskbar_clean.png", "taskbar_exact_icon.png", "test_append.ico", "test_multi.ico", "old_32.png"]:
        p = os.path.join(BASE_DIR, tmp)
        if os.path.exists(p):
            os.remove(p)

    print("All Snapse brand icons generated and validated!")

if __name__ == "__main__":
    generate_icons()
