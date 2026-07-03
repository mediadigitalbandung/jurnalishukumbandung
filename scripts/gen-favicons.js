// One-off: generate correct square favicons from the real JHB logo.
// Source: ../Logo JHB.png (1024x1024 square). Outputs into public/.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC = path.resolve(__dirname, "../../Logo JHB.png");
const PUB = path.resolve(__dirname, "../public");

async function png(size) {
  return sharp(SRC)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// Minimal multi-image ICO wrapping PNG payloads (Vista+; accepted by Google & all browsers).
function buildIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = 6 + count * 16;
  const entries = [], datas = [];
  for (const { size, buffer } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    datas.push(buffer);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...entries, ...datas]);
}

(async () => {
  if (!fs.existsSync(SRC)) throw new Error("Source logo not found: " + SRC);
  const sizes = [16, 32, 48, 96, 180, 192, 512];
  const bufs = {};
  for (const s of sizes) bufs[s] = await png(s);

  fs.writeFileSync(path.join(PUB, "favicon-16.png"), bufs[16]);
  fs.writeFileSync(path.join(PUB, "favicon-32.png"), bufs[32]);
  fs.writeFileSync(path.join(PUB, "favicon-96.png"), bufs[96]);
  fs.writeFileSync(path.join(PUB, "apple-icon.png"), bufs[180]);
  fs.writeFileSync(path.join(PUB, "icon-192.png"), bufs[192]); // fix wrong PWA icon
  fs.writeFileSync(path.join(PUB, "icon-512.png"), bufs[512]); // fix wrong PWA icon
  fs.writeFileSync(path.join(PUB, "favicon.ico"), buildIco([
    { size: 16, buffer: bufs[16] },
    { size: 32, buffer: bufs[32] },
    { size: 48, buffer: bufs[48] },
  ]));

  console.log("Generated favicons in public/:");
  for (const f of ["favicon.ico", "favicon-16.png", "favicon-32.png", "favicon-96.png", "apple-icon.png", "icon-192.png", "icon-512.png"]) {
    console.log("  " + f + " — " + (fs.statSync(path.join(PUB, f)).size / 1024).toFixed(1) + "KB");
  }
})();
