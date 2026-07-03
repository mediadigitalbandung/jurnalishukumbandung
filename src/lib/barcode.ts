/**
 * Code 128 (subset B) encoder — zero-dependency.
 *
 * Returns an array of alternating bar/space run-lengths (in modules), starting
 * with a bar. Multiply each run by a module width to render on canvas/SVG.
 *
 * Used by the press membership card to encode the journalist's press-card
 * number into a scannable barcode.
 */

// Canonical Code 128 pattern table, indexed by code value (0..106).
// Each entry is 6 run-lengths (bar,space,bar,space,bar,space) except the
// final Stop pattern (106) which has 7 (it includes the trailing bar).
const PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213",
  "122312", "132212", "221213", "221312", "231212", "112232", "122132",
  "122231", "113222", "123122", "123221", "223211", "221132", "221231",
  "213212", "223112", "312131", "311222", "321122", "321221", "312212",
  "322112", "322211", "212123", "212321", "232121", "111323", "131123",
  "131321", "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121", "313121",
  "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114",
  "413111", "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141", "214121",
  "412121", "111143", "111341", "131141", "114113", "114311", "411113",
  "411311", "113141", "114131", "311141", "411131", "211412", "211214",
  "211232", "2331112",
];

const START_B = 104;
const STOP = 106;

/**
 * Encode a string as Code 128-B run-lengths.
 * Non-printable / out-of-range characters are dropped; falls back to "NA"
 * if nothing encodable remains.
 */
export function code128BWidths(input: string): number[] {
  let values = (input ?? "")
    .split("")
    .map((c) => c.charCodeAt(0))
    .filter((c) => c >= 32 && c <= 126)
    .map((c) => c - 32);

  if (values.length === 0) values = ["N", "A"].map((c) => c.charCodeAt(0) - 32);

  let checksum = START_B;
  values.forEach((v, i) => {
    checksum += v * (i + 1);
  });
  checksum %= 103;

  const codes = [START_B, ...values, checksum, STOP];

  const widths: number[] = [];
  for (const code of codes) {
    const pattern = PATTERNS[code];
    for (let i = 0; i < pattern.length; i++) {
      widths.push(parseInt(pattern[i], 10));
    }
  }
  return widths;
}

/**
 * Draw a Code 128 barcode onto a canvas 2D context.
 * Bars are painted in `color`; the area is assumed pre-cleared (transparent).
 */
export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color = "#111827",
): void {
  const widths = code128BWidths(text);
  const totalModules = widths.reduce((a, b) => a + b, 0);
  const moduleW = width / totalModules;

  ctx.fillStyle = color;
  let cursor = x;
  widths.forEach((run, i) => {
    const runW = run * moduleW;
    if (i % 2 === 0) {
      // even index = bar
      ctx.fillRect(cursor, y, Math.ceil(runW), height);
    }
    cursor += runW;
  });
}
