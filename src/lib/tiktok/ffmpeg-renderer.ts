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

  // Text overlay — supports 9-grid positions (top/center/bottom × left/center/right)
  if (clip.textOverlay && clip.textOverlay.trim()) {
    const text = escapeDrawText(clip.textOverlay.trim().slice(0, 240));
    const color = clip.textColor || "#FFFFFF";
    const position = clip.textPosition || "bottom";

    // Parse position into vertical+horizontal parts (backwards compat)
    const [vPart, hPart] = (() => {
      if (position === "top") return ["top", "center"];
      if (position === "center") return ["center", "center"];
      if (position === "bottom") return ["bottom", "center"];
      const parts = position.split("-");
      return parts.length === 2 ? parts : ["bottom", "center"];
    })();

    // Vertical: 120px margin from edge
    let yExpr = "h-th-120";
    if (vPart === "top") yExpr = "120";
    else if (vPart === "center") yExpr = "(h-th)/2";

    // Horizontal: 80px margin from edge
    let xExpr = "(w-tw)/2";
    if (hPart === "left") xExpr = "80";
    else if (hPart === "right") xExpr = "w-tw-80";

    // Box behind text for readability
    filters.push(
      `drawtext=text='${text}':fontcolor=${color}:fontsize=54:box=1:boxcolor=black@0.5:boxborderw=20:x=${xExpr}:y=${yExpr}`
    );
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

    // Step 3: finalize with backsong + trim
    const outputFilename = `tiktok-${spec.videoId}-${sessionId}.mp4`;
    const outputPath = join(TIKTOK_DIR, outputFilename);
    const backsongPath = spec.backsongUrl ? resolveAssetPath(spec.backsongUrl) : null;
    const finalDuration = await finalizeVideo(
      concatPath,
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
