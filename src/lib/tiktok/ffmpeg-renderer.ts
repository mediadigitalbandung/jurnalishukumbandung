/**
 * FFmpeg Video Renderer for TikTok
 *
 * Pipeline:
 * 1. Normalize each clip: resize to 1080x1920 (9:16), pad if needed, set fps, add text overlay, Ken Burns for images
 * 2. Concatenate all normalized clips with optional transitions
 * 3. Mix with backsong audio (if provided)
 * 4. Trim to max duration (default 60s)
 * 5. Output H.264 MP4 suitable for TikTok direct upload
 */

import { spawn } from "child_process";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import type { ClipInput, RenderSpec, RenderResult } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
const PUBLIC_DIR = join(process.cwd(), process.env.UPLOAD_DIR || "public/uploads");
const TIKTOK_DIR = join(PUBLIC_DIR, "tiktok");
const TEMP_DIR = join(PUBLIC_DIR, "tiktok", "temp");

/** Resolve a URL or relative path into an absolute filesystem path */
function resolveAssetPath(urlOrPath: string): string {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    // Convert our public URL back to filesystem path
    const pathname = new URL(urlOrPath).pathname; // e.g. /uploads/xxx.mp4
    return join(process.cwd(), "public", pathname);
  }
  if (urlOrPath.startsWith("/")) {
    return join(process.cwd(), "public", urlOrPath);
  }
  return urlOrPath;
}

/** Detect the best bold font available on this system (cached). */
let _cachedFontPath: string | null | undefined;
function getFontPath(): string | null {
  if (_cachedFontPath !== undefined) return _cachedFontPath;
  // Candidates in priority order: Linux (Ubuntu), macOS, Windows, then null fallback
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "C:\\Windows\\Fonts\\arialbd.ttf",
    "C:\\Windows\\Fonts\\segoeuib.ttf",
  ];
  for (const p of candidates) {
    try { if (existsSync(p)) { _cachedFontPath = p; return p; } } catch { /* ignore */ }
  }
  _cachedFontPath = null;
  return null;
}

/** Escape text for FFmpeg drawtext filter */
function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/\n/g, " ");
}

/** Run ffmpeg command and resolve with stdout, reject on non-zero exit */
function runFfmpeg(args: string[], timeoutMs = 300000): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`FFmpeg timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stderr });
      else reject(new Error(`FFmpeg exit ${code}: ${stderr.slice(-800)}`));
    });
  });
}

/** Normalize 1 clip → standardized intermediate MP4 */
async function normalizeClip(
  clip: ClipInput,
  outputPath: string,
  width: number,
  height: number,
  fps: number
): Promise<void> {
  const srcPath = resolveAssetPath(clip.sourceUrl);
  const duration = Math.max(0.5, clip.durationSec);
  const isImage = clip.type === "image";

  // Apply per-clip offset for letterbox repositioning.
  // offsetX/Y range -1..1 (percentage of free space in letterbox dimension).
  const ox = typeof clip.offsetX === "number" ? Math.max(-1, Math.min(1, clip.offsetX)) : 0;
  const oy = typeof clip.offsetY === "number" ? Math.max(-1, Math.min(1, clip.offsetY)) : 0;

  // BLURRED BACKDROP: instead of black bars, fill the letterbox area with a heavily
  // blurred + darkened copy of the same media. This is the modern TikTok/Reels look.
  // Pipeline:
  //   1. Take source [0:v], split into two streams
  //   2. Stream A: scale to fill canvas via cover (crop), blur heavily, dim
  //   3. Stream B: scale fit (preserve aspect), letterbox-aware position
  //   4. Overlay B on top of A
  const padX = `(W-w)/2*(1+${ox.toFixed(3)})`;
  const padY = `(H-h)/2*(1+${oy.toFixed(3)})`;

  // For images, we apply Ken Burns AFTER overlay (so backdrop stays static, fg zooms)
  let fgChain: string;
  if (isImage && clip.kenBurns) {
    const frames = Math.ceil(duration * fps);
    fgChain = `scale=${width}:${height}:force_original_aspect_ratio=decrease,zoompan=z='min(zoom+0.0015,1.15)':d=${frames}:s=${width}x${height}:fps=${fps}`;
  } else {
    fgChain = `scale=${width}:${height}:force_original_aspect_ratio=decrease,fps=${fps}`;
  }

  // Filter complex:
  //   [0:v] split=2 [bg][fg]
  //   [bg] scale=cover, gblur (heavy), eq (dim 0.7 brightness) → [bgblur]
  //   [fg] (fgChain) → [fgScaled]
  //   [bgblur][fgScaled] overlay at offset
  const filterComplex = [
    `[0:v]split=2[bgsrc][fgsrc]`,
    // Background: scale to COVER canvas (may crop), then blur + dim
    `[bgsrc]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},gblur=sigma=30,eq=brightness=-0.15:saturation=0.7,fps=${fps}[bg]`,
    // Foreground: scale to FIT (letterbox), optional Ken Burns
    `[fgsrc]${fgChain}[fg]`,
    // Overlay foreground on background, centered with offset
    `[bg][fg]overlay=x=${padX}:y=${padY}[v0]`,
  ];

  // Append drawtext to filter chain on top of [v0]
  let finalLabel = "[v0]";
  if (clip.textOverlay && clip.textOverlay.trim()) {
    const text = escapeDrawText(clip.textOverlay.trim().slice(0, 240));
    const color = clip.textColor || "#FFFFFF";
    const fontSize = clip.textFontSize || 54;

    let xExpr = "(w-tw)/2";
    let yExpr = "h-th-120";

    if (typeof clip.textX === "number" && typeof clip.textY === "number") {
      const xPx = Math.round((clip.textX / 100) * width);
      const yPx = Math.round((clip.textY / 100) * height);
      xExpr = `${xPx}-tw/2`;
      yExpr = `${yPx}-th/2`;
    } else {
      const position = clip.textPosition || "bottom";
      const [vPart, hPart] = (() => {
        if (position === "top") return ["top", "center"];
        if (position === "center") return ["center", "center"];
        if (position === "bottom") return ["bottom", "center"];
        const parts = position.split("-");
        return parts.length === 2 ? parts : ["bottom", "center"];
      })();
      if (vPart === "top") yExpr = "120";
      else if (vPart === "center") yExpr = "(h-th)/2";
      if (hPart === "left") xExpr = "80";
      else if (hPart === "right") xExpr = "w-tw-80";
    }

    // TikTok-style drawtext: thick stroke + shadow instead of solid box behind.
    // borderw=6 → bold outline, shadowx/y → soft drop shadow for depth.
    // Falls back to box if user explicitly wants it later.
    const fontFile = getFontPath();
    const fontArg = fontFile ? `:fontfile='${fontFile}'` : "";
    const drawtext = `drawtext=text='${text}':fontcolor=${color}:fontsize=${fontSize}${fontArg}:borderw=6:bordercolor=black@0.95:shadowx=2:shadowy=3:shadowcolor=black@0.6:x=${xExpr}:y=${yExpr}`;

    filterComplex.push(`${finalLabel}${drawtext}[outv]`);
    finalLabel = "[outv]";
  } else {
    // No text — rename v0 to outv for consistency
    filterComplex.push(`${finalLabel}null[outv]`);
    finalLabel = "[outv]";
  }

  const args: string[] = [];

  if (isImage) {
    args.push("-loop", "1", "-t", String(duration), "-i", srcPath);
  } else {
    const trimStart = clip.trimStart && clip.trimStart > 0 ? clip.trimStart : 0;
    if (trimStart > 0) args.push("-ss", String(trimStart));
    args.push("-t", String(duration), "-i", srcPath);
  }

  args.push(
    "-filter_complex", filterComplex.join(";"),
    "-map", "[outv]",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-r", String(fps),
    "-an",                    // no audio at this stage
    "-y",
    outputPath
  );

  await runFfmpeg(args);
}

/** Concat normalized clips using the concat demuxer (fast hard cuts). */
async function concatClips(normalizedPaths: string[], concatListPath: string, outputPath: string): Promise<void> {
  const listContent = normalizedPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(concatListPath, listContent, "utf8");

  const args = [
    "-f", "concat",
    "-safe", "0",
    "-i", concatListPath,
    "-c", "copy",
    "-y",
    outputPath,
  ];
  await runFfmpeg(args);
}

/**
 * Concat clips with crossfade/slide/zoom transitions via xfade filter.
 * Each clip transitions into the next with 0.5s overlap (no gap, smooth blend).
 *
 * Transitions per clip:
 *   - "fade" → xfade transition=fade
 *   - "slide" → xfade transition=slideleft
 *   - "zoom" → xfade transition=zoomin
 *   - "none" or undefined → no transition (uses concat instead)
 *
 * @param clipPaths      Local normalized MP4 paths
 * @param clipTransitions Per-clip transition (transition applies BEFORE entering that clip)
 * @param clipDurations  Each clip's intended duration in seconds (needed for xfade offset)
 * @param outputPath     Final concatenated MP4
 * @param fps            Frame rate (for sync)
 */
async function concatWithTransitions(
  clipPaths: string[],
  clipTransitions: Array<string | null | undefined>,
  clipDurations: number[],
  outputPath: string,
): Promise<void> {
  if (clipPaths.length === 0) throw new Error("No clips to concat");
  if (clipPaths.length === 1) {
    // Single clip — just copy
    await runFfmpeg(["-i", clipPaths[0], "-c", "copy", "-y", outputPath]);
    return;
  }

  const TRANSITION_DUR = 0.5; // 500ms blend per transition (TikTok sweet spot)

  // Map transition kind to xfade name
  const xfadeName = (t: string | null | undefined): string => {
    switch (t) {
      case "fade":  return "fade";
      case "slide": return "slideleft";
      case "zoom":  return "zoomin";
      default:      return ""; // empty = hard cut, use concat instead
    }
  };

  // Check if any transition is requested — if all "none", skip xfade chain entirely
  const hasAnyTransition = clipTransitions.some((t, i) => i > 0 && xfadeName(t));
  if (!hasAnyTransition) {
    // No transitions — use fast concat demuxer
    const listPath = outputPath + ".list.txt";
    await concatClips(clipPaths, listPath, outputPath);
    await unlink(listPath).catch(() => {});
    return;
  }

  // Build xfade chain. xfade requires two inputs at a time.
  // Cumulative offset = sum(clip[0..i].duration) - TRANSITION_DUR * (i transitions so far)
  //   because each xfade overlaps the previous output by TRANSITION_DUR.
  const inputs: string[] = [];
  for (const p of clipPaths) inputs.push("-i", p);

  const filterParts: string[] = [];
  let lastLabel = "[0:v]";
  let cumOffset = clipDurations[0];

  for (let i = 1; i < clipPaths.length; i++) {
    const transition = clipTransitions[i];
    const xName = xfadeName(transition);
    const outLabel = i === clipPaths.length - 1 ? "[outv]" : `[v${i}]`;

    if (xName) {
      // xfade requires offset = where the transition STARTS in the cumulative timeline
      const offset = Math.max(0, cumOffset - TRANSITION_DUR);
      filterParts.push(
        `${lastLabel}[${i}:v]xfade=transition=${xName}:duration=${TRANSITION_DUR}:offset=${offset.toFixed(3)}${outLabel}`,
      );
      cumOffset += clipDurations[i] - TRANSITION_DUR;
    } else {
      // No transition for this junction — concat
      filterParts.push(`${lastLabel}[${i}:v]concat=n=2:v=1:a=0${outLabel}`);
      cumOffset += clipDurations[i];
    }
    lastLabel = outLabel;
  }

  const args = [
    ...inputs,
    "-filter_complex", filterParts.join(";"),
    "-map", "[outv]",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-y",
    outputPath,
  ];
  await runFfmpeg(args, 600000); // 10min — xfade is expensive
}

interface CustomOverlaySpec {
  imagePath: string;      // Local FS path to overlay PNG (already downloaded)
  x: number;              // 0-1 normalized center x
  y: number;              // 0-1 normalized center y
  scale: number;          // 0.1-3 scale factor (1 = 30% of canvas width)
  rotation: number;       // degrees -180 to 180
  opacity: number;        // 0-1
}

/**
 * Apply frame overlay style on top of the concatenated video.
 * Frame styles applied entirely via FFmpeg filters — no PNG assets needed.
 * For "custom" style, uses an external PNG file with positioning/scale/rotation.
 */
async function applyFrameOverlay(
  inputPath: string,
  outputPath: string,
  frameStyle: string,
  breakingText: string | null | undefined,
  title: string | null | undefined,
  width: number,
  height: number,
  customOverlay?: CustomOverlaySpec
): Promise<void> {
  const filters: string[] = [];

  // Handle custom overlay separately (requires second input)
  if (frameStyle === "custom") {
    if (!customOverlay) {
      // No overlay image configured — just copy
      await runFfmpeg(["-i", inputPath, "-c", "copy", "-y", outputPath]);
      return;
    }

    // Compute target overlay width in pixels (30% of canvas at scale=1)
    const baseWidth = Math.round(0.3 * width);
    const targetWidth = Math.max(20, Math.round(baseWidth * customOverlay.scale));
    // Center coordinates in canvas pixels
    const centerX = Math.round(customOverlay.x * width);
    const centerY = Math.round(customOverlay.y * height);
    const opacity = Math.max(0, Math.min(1, customOverlay.opacity));
    const rotation = customOverlay.rotation || 0;

    // Build filter graph:
    // [1:v] scale -> rotate -> opacity adjust
    // [0:v][1:v] overlay at center
    const overlayFilters: string[] = [
      `[1:v]scale=${targetWidth}:-1`,
    ];
    if (rotation !== 0) {
      // rotate filter uses radians; ow/oh auto-expand
      overlayFilters.push(`rotate=${rotation}*PI/180:c=none:ow=rotw(${rotation}*PI/180):oh=roth(${rotation}*PI/180)`);
    }
    if (opacity < 1) {
      // format to RGBA first, then adjust alpha
      overlayFilters.push(`format=rgba`, `colorchannelmixer=aa=${opacity.toFixed(3)}`);
    }
    const filterComplex = `${overlayFilters.join(",")}[ov];[0:v][ov]overlay=x=${centerX}-overlay_w/2:y=${centerY}-overlay_h/2`;

    const args = [
      "-i", inputPath,
      "-i", customOverlay.imagePath,
      "-filter_complex", filterComplex,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-c:a", "copy",
      "-y",
      outputPath,
    ];
    await runFfmpeg(args);
    return;
  }

  switch (frameStyle) {
    case "ticker-news": {
      // Red bottom bar with brand text (news ticker style)
      filters.push(
        // Red bar at bottom
        `drawbox=x=0:y=${height - 140}:w=${width}:h=140:color=0xCC0000@0.95:t=fill`,
        // White left indicator bar
        `drawbox=x=0:y=${height - 140}:w=12:h=140:color=white:t=fill`,
        // LIVE badge (red circle with animated pulse effect via fontsize)
        `drawbox=x=40:y=${height - 115}:w=130:h=40:color=white:t=fill`,
        `drawtext=text='LIVE':fontcolor=0xCC0000:fontsize=28:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf':x=80:y=${height - 105}`,
        // JHB brand text
        `drawtext=text='JURNALIS HUKUM BANDUNG':fontcolor=white:fontsize=32:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf':x=200:y=${height - 110}`
      );
      break;
    }

    case "brand-green": {
      // JHB brand green border (12px) + logo bottom-right corner hint
      filters.push(
        // Top green bar
        `drawbox=x=0:y=0:w=${width}:h=12:color=0x00AA13:t=fill`,
        // Bottom green bar
        `drawbox=x=0:y=${height - 12}:w=${width}:h=12:color=0x00AA13:t=fill`,
        // Left green bar
        `drawbox=x=0:y=0:w=12:h=${height}:color=0x00AA13:t=fill`,
        // Right green bar
        `drawbox=x=${width - 12}:y=0:w=12:h=${height}:color=0x00AA13:t=fill`,
        // Small JHB text bottom-right
        `drawtext=text='@jurnalishukumbdg':fontcolor=white:fontsize=26:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf':box=1:boxcolor=0x00AA13@0.9:boxborderw=10:x=w-tw-40:y=h-th-40`
      );
      break;
    }

    case "breaking-news": {
      const breaking = breakingText?.trim() || "BREAKING NEWS";
      const escBreaking = escapeDrawText(breaking.toUpperCase().slice(0, 80));
      filters.push(
        // Top red breaking bar
        `drawbox=x=0:y=60:w=${width}:h=100:color=0xCC0000@0.95:t=fill`,
        // BREAKING badge left
        `drawbox=x=30:y=75:w=250:h=70:color=white:t=fill`,
        `drawtext=text='BREAKING':fontcolor=0xCC0000:fontsize=40:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf':x=55:y=95`,
        // Breaking news text
        `drawtext=text='${escBreaking}':fontcolor=white:fontsize=38:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf':x=310:y=93`,
        // Bottom JHB ticker
        `drawbox=x=0:y=${height - 80}:w=${width}:h=80:color=black@0.85:t=fill`,
        `drawtext=text='JURNALIS HUKUM BANDUNG · jurnalishukumbandung.com':fontcolor=white:fontsize=28:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf':x=(w-tw)/2:y=${height - 60}`
      );
      break;
    }

    case "minimal": {
      // Thin white border 4px
      filters.push(
        `drawbox=x=0:y=0:w=${width}:h=4:color=white:t=fill`,
        `drawbox=x=0:y=${height - 4}:w=${width}:h=4:color=white:t=fill`,
        `drawbox=x=0:y=0:w=4:h=${height}:color=white:t=fill`,
        `drawbox=x=${width - 4}:y=0:w=4:h=${height}:color=white:t=fill`
      );
      break;
    }

    case "lower-third": {
      // Lower-third graphic like TV news (title + subtitle section at bottom)
      const titleText = title?.trim() ? escapeDrawText(title.trim().slice(0, 80)) : "";
      const lowerThirdFilters = [
        // Semi-transparent black lower third
        `drawbox=x=60:y=${height - 280}:w=${width - 120}:h=180:color=black@0.75:t=fill`,
        // Green accent stripe left
        `drawbox=x=60:y=${height - 280}:w=8:h=180:color=0x00AA13:t=fill`,
        // Title text (if provided)
        titleText ? `drawtext=text='${titleText}':fontcolor=white:fontsize=42:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf':x=90:y=${height - 260}` : "",
        // Source line
        `drawtext=text='Jurnalis Hukum Bandung':fontcolor=0x00AA13:fontsize=28:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf':x=90:y=${height - 145}`,
      ].filter(Boolean);
      filters.push(...lowerThirdFilters);
      break;
    }

    case "none":
    default:
      // No frame — just copy
      await runFfmpeg(["-i", inputPath, "-c", "copy", "-y", outputPath]);
      return;
  }

  const args = [
    "-i", inputPath,
    "-vf", filters.join(","),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    "-y",
    outputPath,
  ];
  await runFfmpeg(args);
}

/**
 * Apply multiple PNG overlays on top of video. Each overlay independently scaled, positioned, rotated.
 * Builds filter_complex chain with cumulative overlay filters.
 *
 * Returns: void (writes to outputPath)
 */
async function applyMultiOverlays(
  inputPath: string,
  outputPath: string,
  overlays: Array<{
    imagePath: string;
    x: number;       // 0-1 normalized
    y: number;       // 0-1 normalized
    scale: number;   // 0.1-3
    rotation: number; // -180..180
    opacity: number;  // 0-1
  }>,
  width: number,
  height: number
): Promise<void> {
  if (overlays.length === 0) {
    await runFfmpeg(["-i", inputPath, "-c", "copy", "-y", outputPath]);
    return;
  }

  // Build inputs: -i video, then -i overlay1, -i overlay2, ...
  const inputs: string[] = ["-i", inputPath];
  for (const o of overlays) inputs.push("-i", o.imagePath);

  // Build filter_complex chain.
  // For each overlay: scale → rotate → format with alpha → overlay onto base
  // Each overlay's base is 30% canvas width × scale (matches client-side preview math).
  const filterParts: string[] = [];
  let lastLabel = "[0:v]"; // start with main video stream

  overlays.forEach((o, i) => {
    const overlayInputIdx = i + 1; // overlay PNG is input index i+1
    const baseW = Math.round(0.3 * width * o.scale); // proportional to canvas
    const xPx = Math.round(o.x * width);
    const yPx = Math.round(o.y * height);
    const opacity = Math.max(0, Math.min(1, o.opacity));

    const scaledLabel = `[ovS${i}]`;
    const rotatedLabel = `[ovR${i}]`;
    const finalLabel = i === overlays.length - 1 ? "[outv]" : `[v${i}]`;

    // 1. Scale overlay PNG to baseW (preserve aspect)
    filterParts.push(`[${overlayInputIdx}:v]scale=${baseW}:-1${scaledLabel}`);

    // 2. Rotate (skip if 0 to keep crisp)
    let nextInput = scaledLabel;
    if (Math.abs(o.rotation) > 0.5) {
      filterParts.push(`${scaledLabel}rotate=${(o.rotation * Math.PI / 180).toFixed(4)}:c=none:ow=rotw(iw):oh=roth(ih)${rotatedLabel}`);
      nextInput = rotatedLabel;
    }

    // 3. Apply opacity (multiply alpha channel)
    let opacityLabel = nextInput;
    if (opacity < 0.99) {
      const alphaLabel = `[ovA${i}]`;
      filterParts.push(`${nextInput}format=rgba,colorchannelmixer=aa=${opacity.toFixed(3)}${alphaLabel}`);
      opacityLabel = alphaLabel;
    }

    // 4. Overlay onto previous layer with center positioning (x = xPx - W/2, y = yPx - H/2)
    filterParts.push(
      `${lastLabel}${opacityLabel}overlay=${xPx}-overlay_w/2:${yPx}-overlay_h/2${finalLabel}`
    );

    lastLabel = finalLabel;
  });

  const filterComplex = filterParts.join(";");

  const args = [
    ...inputs,
    "-filter_complex", filterComplex,
    "-map", "[outv]",
    "-map", "0:a?",       // copy audio if present
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    "-y",
    outputPath,
  ];

  await runFfmpeg(args);
}

/**
 * Burn timed subtitle entries into video.
 * Generates per-segment drawtext filter with enable=between(t,start,end) for time-based visibility.
 */
async function burnSubtitleEntries(
  inputPath: string,
  outputPath: string,
  entries: Array<{ startSec: number; endSec: number; text: string; y?: number | null; fontSize?: number | null; color?: string | null }>,
  width: number,
  height: number
): Promise<void> {
  if (entries.length === 0) {
    await runFfmpeg(["-i", inputPath, "-c", "copy", "-y", outputPath]);
    return;
  }

  const fontFile = getFontPath();
  const fontArg  = fontFile ? `:fontfile='${fontFile}'` : "";

  const filters: string[] = entries.map((e) => {
    const text = escapeDrawText(e.text.slice(0, 200));
    const fontSize = e.fontSize || 54;
    const color = e.color || "#FFFFFF";
    const yPos = typeof e.y === "number" ? Math.round(e.y * height) : Math.round(0.85 * height);
    // TikTok-style subtitle: thick stroke + drop shadow for readability without ugly box.
    // Stroke is the dominant TikTok caption look (no box, just bold outlined text).
    return `drawtext=text='${text}':fontcolor=${color}:fontsize=${fontSize}${fontArg}:borderw=6:bordercolor=black@0.95:shadowx=2:shadowy=3:shadowcolor=black@0.6:x=(w-tw)/2:y=${yPos}-th/2:enable='between(t,${e.startSec.toFixed(3)},${e.endSec.toFixed(3)})'`;
  });

  const args = [
    "-i", inputPath,
    "-vf", filters.join(","),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    "-y",
    outputPath,
  ];
  await runFfmpeg(args);
}

/**
 * Extract a high-quality thumbnail from a rendered MP4.
 * Picks the frame at ~1.5s (avoiding the very first frames which may be transitions).
 * Output: 1080×1920 JPG at quality 85, ready for TikTok cover.
 */
async function extractThumbnail(videoPath: string, outputPath: string): Promise<void> {
  const args = [
    "-ss", "1.5",
    "-i", videoPath,
    "-vframes", "1",
    "-q:v", "3",       // ffmpeg JPEG quality scale 1-31, lower=better. 3 ≈ 90% quality
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    "-y",
    outputPath,
  ];
  await runFfmpeg(args, 30000);
}

/** Get duration of a media file using ffprobe */
async function probeDuration(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      path,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    proc.stdout?.on("data", (d) => { out += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(parseFloat(out.trim()) || 0);
      else reject(new Error(`ffprobe exit ${code}`));
    });
    proc.on("error", reject);
  });
}

/** Mix video with optional backsong + optional fade-out + trim to max duration */
async function finalizeVideo(
  videoPath: string,
  backsongPath: string | null,
  backsongVolume: number,
  maxDuration: number,
  outputPath: string
): Promise<number> {
  const videoDuration = await probeDuration(videoPath);
  const targetDuration = Math.min(videoDuration, maxDuration);

  // Output encoding flags — TikTok-optimized:
  //   -movflags +faststart → moov atom at start, streaming-friendly (TikTok scrubbing)
  //   -crf 20 → high quality (visually near-lossless)
  //   -maxrate 8M -bufsize 12M → cap bitrate so file size stays reasonable (~5-8MB/min)
  //   -profile:v high -level 4.2 → broad device compatibility incl iOS
  //   -preset medium → better compression than veryfast at final step (still fast enough)
  const VIDEO_FLAGS = [
    "-c:v", "libx264",
    "-preset", "medium",
    "-profile:v", "high",
    "-level", "4.2",
    "-crf", "20",
    "-maxrate", "8M",
    "-bufsize", "12M",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
  ];

  const args: string[] = ["-i", videoPath];

  if (backsongPath) {
    args.push("-i", backsongPath);
    const vol = Math.max(0, Math.min(1, backsongVolume));
    // Audio chain:
    //   - volume scale
    //   - trim to video length
    //   - loudnorm (EBU R128, -14 LUFS = TikTok default) — consistent loudness across videos
    //   - afade out last 1s
    const filterComplex = [
      `[1:a]volume=${vol},atrim=0:${targetDuration},loudnorm=I=-14:LRA=11:TP=-1.5,afade=t=out:st=${Math.max(0, targetDuration - 1)}:d=1[music]`,
    ].join(";");
    args.push(
      "-filter_complex", filterComplex,
      "-map", "0:v",
      "-map", "[music]",
      ...VIDEO_FLAGS,
      "-c:a", "aac",
      "-b:a", "192k",
      "-ar", "44100",
      "-shortest",
      "-t", String(targetDuration),
      "-y",
      outputPath
    );
  } else {
    // No audio — add silent track so TikTok upload succeeds
    args.push(
      "-f", "lavfi",
      "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      ...VIDEO_FLAGS,
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-t", String(targetDuration),
      "-y",
      outputPath
    );
  }

  await runFfmpeg(args, 600000); // 10min — encoding at preset=medium takes longer
  return targetDuration;
}

/** Main entry: render a full TikTok video from clips + backsong */
export async function renderTiktokVideo(spec: RenderSpec): Promise<RenderResult> {
  const width = spec.outputWidth || 1080;
  const height = spec.outputHeight || 1920;
  const fps = spec.outputFps || 30;
  const maxDuration = spec.maxDurationSec || 60;

  // Prepare dirs
  await mkdir(TIKTOK_DIR, { recursive: true });
  await mkdir(TEMP_DIR, { recursive: true });

  const sessionId = randomBytes(6).toString("hex");
  const workDir = join(TEMP_DIR, sessionId);
  await mkdir(workDir, { recursive: true });

  const normalizedPaths: string[] = [];

  try {
    // Step 1: normalize each clip (sequential to avoid CPU thrash)
    const sortedClips = [...spec.clips].sort((a, b) => a.order - b.order);
    if (sortedClips.length === 0) {
      return { success: false, error: "Tidak ada clip untuk dirender" };
    }

    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const normPath = join(workDir, `norm-${String(i).padStart(3, "0")}.mp4`);
      await normalizeClip(clip, normPath, width, height, fps);
      normalizedPaths.push(normPath);
    }

    // Step 2: concat all normalized clips with optional transitions
    const concatListPath = join(workDir, "concat.txt");
    const concatPath = join(workDir, "concat.mp4");
    const clipTransitions = sortedClips.map((c) => c.transition);
    const clipDurations   = sortedClips.map((c) => Math.max(0.5, c.durationSec));
    const hasTransitions  = clipTransitions.some((t, i) => i > 0 && t && t !== "none");

    if (hasTransitions) {
      await concatWithTransitions(normalizedPaths, clipTransitions, clipDurations, concatPath);
    } else {
      await concatClips(normalizedPaths, concatListPath, concatPath);
    }

    // Step 2b: apply frame overlay (if any)
    const frameStyle = spec.frameStyle || "none";
    const framedPath = frameStyle === "none" ? concatPath : join(workDir, "framed.mp4");
    if (frameStyle !== "none") {
      // Build custom overlay spec if needed (resolve URL → local FS path)
      let customSpec: CustomOverlaySpec | undefined;
      if (frameStyle === "custom" && spec.customOverlay?.imageUrl) {
        const overlayFsPath = resolveAssetPath(spec.customOverlay.imageUrl);
        customSpec = {
          imagePath: overlayFsPath,
          x: spec.customOverlay.x,
          y: spec.customOverlay.y,
          scale: spec.customOverlay.scale,
          rotation: spec.customOverlay.rotation,
          opacity: spec.customOverlay.opacity,
        };
      }
      await applyFrameOverlay(concatPath, framedPath, frameStyle, spec.breakingText, spec.title, width, height, customSpec);
    }

    // Step 2c: apply multiple PNG overlays (NEW — multi-overlay support)
    const overlayInputs = (spec.multiOverlays || []).slice().sort((a, b) => a.order - b.order);
    const multiPath = overlayInputs.length > 0 ? join(workDir, "multi.mp4") : framedPath;
    if (overlayInputs.length > 0) {
      const resolvedOverlays = overlayInputs.map((o) => ({
        imagePath: resolveAssetPath(o.imageUrl),
        x: o.x,
        y: o.y,
        scale: o.scale,
        rotation: o.rotation,
        opacity: o.opacity,
      }));
      await applyMultiOverlays(framedPath, multiPath, resolvedOverlays, width, height);
    }

    // Step 2d: burn timed subtitle entries (NEW — video-level subtitle with timing)
    const subtitleInputs = (spec.subtitleEntries || []).slice().sort((a, b) => a.startSec - b.startSec);
    const subtitledPath = subtitleInputs.length > 0 ? join(workDir, "subtitled.mp4") : multiPath;
    if (subtitleInputs.length > 0) {
      await burnSubtitleEntries(multiPath, subtitledPath, subtitleInputs, width, height);
    }

    // Step 3: finalize with backsong + trim
    const outputFilename = `tiktok-${spec.videoId}-${sessionId}.mp4`;
    const outputPath = join(TIKTOK_DIR, outputFilename);
    const backsongPath = spec.backsongUrl ? resolveAssetPath(spec.backsongUrl) : null;
    const finalDuration = await finalizeVideo(
      subtitledPath,
      backsongPath,
      spec.backsongVolume ?? 0.5,
      maxDuration,
      outputPath
    );

    // Cleanup intermediates
    for (const p of normalizedPaths) {
      await unlink(p).catch(() => {});
    }
    await unlink(concatListPath).catch(() => {});
    await unlink(concatPath).catch(() => {});
    if (frameStyle !== "none") await unlink(framedPath).catch(() => {});
    if (overlayInputs.length > 0) await unlink(multiPath).catch(() => {});

    const stats = await stat(outputPath);
    const outputUrl = `${BASE_URL.replace(/\/$/, "")}/uploads/tiktok/${outputFilename}`;

    // Extract cover thumbnail (best-effort — if it fails, video still ok)
    const thumbFilename = outputFilename.replace(/\.mp4$/, ".jpg");
    const thumbPath = join(TIKTOK_DIR, thumbFilename);
    let thumbnailUrl: string | undefined;
    try {
      await extractThumbnail(outputPath, thumbPath);
      thumbnailUrl = `${BASE_URL.replace(/\/$/, "")}/uploads/tiktok/${thumbFilename}`;
    } catch (err) {
      console.warn("[FFMPEG] Thumbnail extract failed:", err instanceof Error ? err.message : err);
    }

    return {
      success: true,
      outputPath,
      outputUrl,
      thumbnailUrl,
      durationSec: finalDuration,
      sizeBytes: stats.size,
    };
  } catch (err) {
    // Cleanup on error
    for (const p of normalizedPaths) {
      await unlink(p).catch(() => {});
    }
    return {
      success: false,
      error: err instanceof Error ? err.message.slice(0, 500) : "Unknown render error",
    };
  }
}
