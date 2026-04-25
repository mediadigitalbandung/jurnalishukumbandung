/**
 * HyperFrames Renderer
 *
 * Implements the same RenderResult contract as ffmpeg-renderer, but uses HyperFrames
 * to render HTML compositions to MP4 via headless Chrome + FFmpeg.
 *
 * Architecture:
 * - We can't import 'hyperframes' npm package directly because Next.js runs on Node 20,
 *   while hyperframes requires Node 22.
 * - Instead, we install hyperframes globally under Node 22 (via nvm), and spawn it as
 *   a subprocess from Next.js. The subprocess uses the Node 22 binary.
 *
 * Steps:
 * 1. Build HTML composition from TiktokVideo data
 * 2. Write composition to temp directory
 * 3. Spawn `node22 hyperframes render` against the composition
 * 4. Move MP4 output to public/uploads/tiktok/
 * 5. Return URL
 *
 * Required VPS setup:
 * - Node 22 installed via nvm (path: /root/.nvm/versions/node/v22.x.x/bin/node)
 * - Chromium installed (PUPPETEER_EXECUTABLE_PATH or hyperframes auto-detect)
 * - hyperframes installed in /var/www/jhb-hyperframes/ (separate node_modules to avoid Next.js conflicts)
 */

import { spawn } from "child_process";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { buildHyperframesComposition } from "./composition";
import type { RenderResult, RenderSpec } from "../types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
const PUBLIC_DIR = join(process.cwd(), process.env.UPLOAD_DIR || "public/uploads");
const TIKTOK_DIR = join(PUBLIC_DIR, "tiktok");
const TEMP_DIR = join(TIKTOK_DIR, "hf-temp");

// Configurable via env vars; defaults match expected VPS setup
const NODE22_BIN = process.env.HYPERFRAMES_NODE_BIN || "/root/.nvm/versions/node/v22.22.2/bin/node";
const HYPERFRAMES_PROJECT = process.env.HYPERFRAMES_PROJECT_DIR || "/var/www/jhb-hyperframes";
// Hyperframes manages its own Chrome download via @puppeteer/browsers — leave undefined to let it auto-detect.
// Set HYPERFRAMES_CHROMIUM env var to override (e.g., /opt/puppeteer-chrome/chrome/linux-148.x.x/chrome-linux64/chrome)
const CHROMIUM_BIN = process.env.HYPERFRAMES_CHROMIUM || "";

/**
 * Run hyperframes render via subprocess.
 * Returns stderr/stdout for debugging.
 */
function runHyperframes(args: string[], cwd: string, timeoutMs = 600000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // We invoke `node hyperframes-bin render <composition.html> --output <video.mp4>`
    // hyperframes binary lives at HYPERFRAMES_PROJECT/node_modules/.bin/hyperframes
    const hfBin = join(HYPERFRAMES_PROJECT, "node_modules", ".bin", "hyperframes");
    const proc = spawn(NODE22_BIN, [hfBin, ...args], {
      cwd,
      env: {
        ...process.env,
        ...(CHROMIUM_BIN ? { PUPPETEER_EXECUTABLE_PATH: CHROMIUM_BIN } : {}),
        // Disable telemetry
        DO_NOT_TRACK: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`HyperFrames timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`HyperFrames exit ${code}: ${stderr.slice(-1000)}`));
    });
  });
}

/**
 * Render TikTok video using HyperFrames.
 * Same contract as ffmpeg-renderer: takes RenderSpec, returns RenderResult.
 */
export async function renderWithHyperframes(spec: RenderSpec): Promise<RenderResult> {
  await mkdir(TIKTOK_DIR, { recursive: true });
  await mkdir(TEMP_DIR, { recursive: true });

  const sessionId = randomBytes(6).toString("hex");
  const workDir = join(TEMP_DIR, sessionId);
  await mkdir(workDir, { recursive: true });

  const compositionPath = join(workDir, "index.html");
  const outputFilename = `tiktok-${spec.videoId}-hf-${sessionId}.mp4`;
  const outputPath = join(TIKTOK_DIR, outputFilename);

  try {
    // 1. Build & write composition HTML
    const html = buildHyperframesComposition(spec);
    await writeFile(compositionPath, html, "utf8");

    // 2. Render via hyperframes CLI
    //    Args reference: hyperframes render <composition> --output <output.mp4> [--fps N]
    const fps = spec.outputFps || 30;
    await runHyperframes(
      [
        "render",
        compositionPath,
        "--output", outputPath,
        "--fps", String(fps),
      ],
      workDir
    );

    // 3. Verify output
    const stats = await stat(outputPath);
    if (stats.size < 1024) {
      throw new Error(`Output file terlalu kecil (${stats.size} bytes) — render mungkin gagal`);
    }

    // Cleanup intermediate composition file (keep output)
    await unlink(compositionPath).catch(() => {});

    const outputUrl = `${BASE_URL.replace(/\/$/, "")}/uploads/tiktok/${outputFilename}`;
    const totalDuration = spec.clips.reduce((sum, c) => sum + c.durationSec, 0);

    return {
      success: true,
      outputPath,
      outputUrl,
      durationSec: Math.min(totalDuration, spec.maxDurationSec || 60),
      sizeBytes: stats.size,
    };
  } catch (err) {
    // Cleanup on error
    await unlink(compositionPath).catch(() => {});
    return {
      success: false,
      error: err instanceof Error ? err.message.slice(0, 1000) : "Unknown HyperFrames render error",
    };
  }
}
