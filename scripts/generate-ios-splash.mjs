// Generate iOS splash screens for PWA "Add to Home Screen"
// Output: public/splash/apple-splash-{w}-{h}.png
// Usage: node scripts/generate-ios-splash.mjs

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT       = path.resolve(process.cwd());
const OUT_DIR    = path.join(ROOT, "public", "splash");
const LOGO_PATH  = path.join(ROOT, "public", "logo-jhb.png");
const BG_COLOR   = { r: 255, g: 255, b: 255, alpha: 1 }; // match manifest background_color

// iOS device viewport sizes (CSS px * device pixel ratio = native px)
// Source: https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/MobileHIG/IconMatrix.html
// Format: [width, height, label]
const DEVICES = [
  // iPhone (portrait + landscape pairs)
  [640,  1136, "iPhone 5/SE 1st"],
  [750,  1334, "iPhone 6/7/8/SE 2nd-3rd"],
  [828,  1792, "iPhone XR/11"],
  [1125, 2436, "iPhone X/XS/11 Pro/12 mini/13 mini"],
  [1170, 2532, "iPhone 12/13/14"],
  [1179, 2556, "iPhone 14 Pro/15"],
  [1242, 2208, "iPhone 6/7/8 Plus"],
  [1242, 2688, "iPhone XS Max/11 Pro Max"],
  [1284, 2778, "iPhone 12/13 Pro Max/14 Plus"],
  [1290, 2796, "iPhone 14 Pro Max/15 Pro Max"],
  // iPad
  [1536, 2048, "iPad Mini/9.7"],
  [1620, 2160, "iPad 10.2"],
  [1668, 2224, "iPad Pro 10.5/Air 3"],
  [1668, 2388, "iPad Pro 11/Air 4-5"],
  [2048, 2732, "iPad Pro 12.9"],
];

async function main() {
  if (!existsSync(LOGO_PATH)) {
    throw new Error(`Logo not found at ${LOGO_PATH}`);
  }
  await mkdir(OUT_DIR, { recursive: true });

  const results = [];

  for (const [w, h, label] of DEVICES) {
    // Logo size: ~28% of shortest dimension, max 320px
    const shortest = Math.min(w, h);
    const logoSize = Math.min(Math.round(shortest * 0.28), 320);

    const logoBuffer = await sharp(LOGO_PATH)
      .resize(logoSize, logoSize, { fit: "contain", background: BG_COLOR })
      .png()
      .toBuffer();

    // Portrait
    await sharp({
      create: { width: w, height: h, channels: 4, background: BG_COLOR },
    })
      .composite([{
        input: logoBuffer,
        top:  Math.round((h - logoSize) / 2),
        left: Math.round((w - logoSize) / 2),
      }])
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `apple-splash-${w}-${h}.png`));
    results.push({ w, h, label, orientation: "portrait" });

    // Landscape (swap dimensions)
    await sharp({
      create: { width: h, height: w, channels: 4, background: BG_COLOR },
    })
      .composite([{
        input: logoBuffer,
        top:  Math.round((w - logoSize) / 2),
        left: Math.round((h - logoSize) / 2),
      }])
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `apple-splash-${h}-${w}.png`));
    results.push({ w: h, h: w, label, orientation: "landscape" });
  }

  // Write a manifest of generated files for the layout to consume
  const manifest = results.map(({ w, h, orientation }) => ({
    width: w,
    height: h,
    orientation,
    href: `/splash/apple-splash-${w}-${h}.png`,
    // Apple media query format
    media: orientation === "portrait"
      ? `(device-width: ${Math.round(w / pixelRatio(w, h))}px) and (device-height: ${Math.round(h / pixelRatio(w, h))}px) and (-webkit-device-pixel-ratio: ${pixelRatio(w, h)}) and (orientation: portrait)`
      : `(device-width: ${Math.round(h / pixelRatio(h, w))}px) and (device-height: ${Math.round(w / pixelRatio(h, w))}px) and (-webkit-device-pixel-ratio: ${pixelRatio(h, w)}) and (orientation: landscape)`,
  }));

  await writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`✓ Generated ${results.length} splash screens at ${OUT_DIR}`);
}

// Best-effort device pixel ratio from native dimensions
function pixelRatio(w, h) {
  const shortest = Math.min(w, h);
  if (shortest <= 640) return 2;
  if (shortest <= 828) return 2;
  if (shortest <= 1125) return 3;
  if (shortest <= 1284) return 3;
  if (shortest <= 1290) return 3;
  if (shortest <= 1668) return 2;
  return 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
