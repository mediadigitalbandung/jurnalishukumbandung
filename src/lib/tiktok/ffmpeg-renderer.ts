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

  // Build video filter chain
  const filters: string[] = [];

  if (isImage) {
    // Scale image to fit 9:16, pad with black if needed
    // Optionally Ken Burns (slow zoom)
    if (clip.kenBurns) {
      // zoompan: zoom from 1.0 to 1.15 over duration
      const frames = Math.ceil(duration * fps);
      filters.push(
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
        `zoompan=z='min(zoom+0.0015,1.15)':d=${frames}:s=${width}x${height}:fps=${fps}`
      );
    } else {
      filters.push(
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
        `fps=${fps}`
      );
    }
  } else {
    // Video: scale + pad to 9:16 (keep original without cropping to preserve content)
    filters.push(
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      `fps=${fps}`
    );
  }

  // Text overlay — supports pixel-precise (textX/textY %) OR 9-grid presets
  if (clip.textOverlay && clip.textOverlay.trim()) {
    const text = escapeDrawText(clip.textOverlay.trim().slice(0, 240));
    const color = clip.textColor || "#FFFFFF";
    const fontSize = clip.textFontSize || 54;
    const rotation = clip.textRotation || 0;

    let xExpr = "(w-tw)/2";
    let yExpr = "h-th-120";

    // Pixel-precise (from drag-drop editor): textX/textY as percentage 0-100
    if (typeof clip.textX === "number" && typeof clip.textY === "number") {
      // Center text at (x%, y%) of video dimensions
      const xPx = Math.round((clip.textX / 100) * width);
      const yPx = Math.round((clip.textY / 100) * height);
      xExpr = `${xPx}-tw/2`;
      yExpr = `${yPx}-th/2`;
    } else {
      // Fallback: 9-grid preset
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

    // Box behind text for readability
    let drawtext = `drawtext=text='${text}':fontcolor=${color}:fontsize=${fontSize}:box=1:boxcolor=black@0.5:boxborderw=20:x=${xExpr}:y=${yExpr}`;

    // Apply rotation via filtergraph wrapper (FFmpeg drawtext doesn't support rotation directly)
    // For rotation != 0, we'd need separate rotation layer — skip for now (common use case: 0°)
    if (rotation !== 0) {
      // Log but don't fail — rotation support requires more complex filter graph
      console.warn("[FFMPEG] Text rotation requested but not yet supported in render pipeline");
    }

    filters.push(drawtext);
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
    "-vf", filters.join(","),
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

/** Concat normalized clips using the concat demuxer (fast, no re-encode needed since they share format) */
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
 * Apply frame overlay style on top of the concatenated video.
 * Frame styles applied entirely via FFmpeg filters — no PNG assets needed.
 */
async function applyFrameOverlay(
  inputPath: string,
  outputPath: string,
  frameStyle: string,
  breakingText: string | null | undefined,
  title: string | null | undefined,
  width: number,
  height: number
): Promise<void> {
  const filters: string[] = [];

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

  const args: string[] = ["-i", videoPath];

  if (backsongPath) {
    args.push("-i", backsongPath);
    const vol = Math.max(0, Math.min(1, backsongVolume));
    // audio filter: trim backsong to video length, volume control, fade out last 1s
    const filterComplex = [
      `[1:a]volume=${vol},atrim=0:${targetDuration},afade=t=out:st=${Math.max(0, targetDuration - 1)}:d=1[music]`,
    ].join(";");
    args.push(
      "-filter_complex", filterComplex,
      "-map", "0:v",
      "-map", "[music]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-t", String(targetDuration),
      "-y",
      outputPath
    );
  } else {
    // No audio — add silent audio track (TikTok usually prefers video with audio)
    args.push(
      "-f", "lavfi",
      "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-t", String(targetDuration),
      "-y",
      outputPath
    );
  }

  await runFfmpeg(args);
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

    // Step 2: concat all normalized clips
    const concatListPath = join(workDir, "concat.txt");
    const concatPath = join(workDir, "concat.mp4");
    await concatClips(normalizedPaths, concatListPath, concatPath);

    // Step 2b: apply frame overlay (if any)
    const frameStyle = spec.frameStyle || "none";
    const framedPath = frameStyle === "none" ? concatPath : join(workDir, "framed.mp4");
    if (frameStyle !== "none") {
      await applyFrameOverlay(concatPath, framedPath, frameStyle, spec.breakingText, spec.title, width, height);
    }

    // Step 3: finalize with backsong + trim
    const outputFilename = `tiktok-${spec.videoId}-${sessionId}.mp4`;
    const outputPath = join(TIKTOK_DIR, outputFilename);
    const backsongPath = spec.backsongUrl ? resolveAssetPath(spec.backsongUrl) : null;
    const finalDuration = await finalizeVideo(
      framedPath,
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

    const stats = await stat(outputPath);
    const outputUrl = `${BASE_URL.replace(/\/$/, "")}/uploads/tiktok/${outputFilename}`;

    return {
      success: true,
      outputPath,
      outputUrl,
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
