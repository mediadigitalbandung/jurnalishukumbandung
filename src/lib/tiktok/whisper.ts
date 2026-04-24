/**
 * OpenAI Whisper integration for auto-subtitle generation.
 *
 * Flow:
 * 1. Download clip video from URL
 * 2. Extract audio via FFmpeg (16kHz mono MP3)
 * 3. Send to OpenAI Whisper API (response_format=verbose_json for timestamps)
 * 4. Parse segments into [{start, end, text}] array
 * 5. Save to TiktokClip.subtitles
 *
 * Cost: ~$0.006 per minute of audio
 *
 * Requires: OPENAI_API_KEY env var (or systemSetting key "openai_api_key")
 */

import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";
import { mkdir, unlink, readFile } from "fs/promises";
import { join, extname } from "path";
import { randomBytes } from "crypto";
import { tmpdir } from "os";

const TEMP_DIR = join(tmpdir(), "jhb-whisper");

export interface SubtitleSegment {
  start: number; // seconds
  end: number;
  text: string;
}

/** Get OpenAI API key from DB (systemSetting) or env */
export async function getOpenAIKey(): Promise<string | null> {
  try {
    const s = await prisma.systemSetting.findUnique({ where: { key: "openai_api_key" } });
    return s?.value || process.env.OPENAI_API_KEY || null;
  } catch {
    return process.env.OPENAI_API_KEY || null;
  }
}

export async function hasWhisperKey(): Promise<boolean> {
  const k = await getOpenAIKey();
  return !!k;
}

/** Download remote video (or copy local) to temp file */
async function downloadOrCopy(sourceUrl: string, outPath: string): Promise<void> {
  if (sourceUrl.startsWith("http")) {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`Download gagal: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const { writeFile } = await import("fs/promises");
    await writeFile(outPath, buf);
  } else {
    // Local path — resolve to absolute
    const { copyFile } = await import("fs/promises");
    const abs = sourceUrl.startsWith("/uploads/")
      ? join(process.cwd(), "public", sourceUrl)
      : sourceUrl;
    await copyFile(abs, outPath);
  }
}

/** Extract audio (16kHz mono MP3, Whisper-optimized) */
async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-i", videoPath,
      "-vn",               // no video
      "-ac", "1",          // mono
      "-ar", "16000",      // 16kHz (Whisper optimal)
      "-b:a", "64k",       // lower bitrate for upload efficiency
      "-y", audioPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", reject);
  });
}

/** Call OpenAI Whisper API */
async function transcribeWithWhisper(
  audioPath: string,
  apiKey: string,
  language = "id"
): Promise<SubtitleSegment[]> {
  const audioBuffer = await readFile(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.mp3");
  formData.append("model", "whisper-1");
  formData.append("language", language);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API error: ${res.status} — ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data.segments)) {
    throw new Error("Whisper response tidak punya segments");
  }

  return data.segments.map((s: { start: number; end: number; text: string }) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));
}

/** Main entry: generate subtitles for a clip */
export async function generateSubtitlesForClip(clipId: string): Promise<SubtitleSegment[]> {
  const apiKey = await getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY belum dikonfigurasi. Set di env VPS atau systemSetting 'openai_api_key'.");
  }

  const clip = await prisma.tiktokClip.findUnique({ where: { id: clipId } });
  if (!clip) throw new Error("Clip tidak ditemukan");
  if (clip.type !== "video") throw new Error("Auto-subtitle hanya untuk clip video (bukan image)");

  await mkdir(TEMP_DIR, { recursive: true });
  const sessionId = randomBytes(6).toString("hex");
  const videoPath = join(TEMP_DIR, `${sessionId}${extname(clip.sourceUrl) || ".mp4"}`);
  const audioPath = join(TEMP_DIR, `${sessionId}.mp3`);

  try {
    await downloadOrCopy(clip.sourceUrl, videoPath);
    await extractAudio(videoPath, audioPath);
    const segments = await transcribeWithWhisper(audioPath, apiKey);

    // Save to DB
    await prisma.tiktokClip.update({
      where: { id: clipId },
      data: { subtitles: segments as unknown as object },
    });

    return segments;
  } finally {
    // Cleanup
    await unlink(videoPath).catch(() => {});
    await unlink(audioPath).catch(() => {});
  }
}

/** Convert subtitle segments to SRT format for FFmpeg */
export function segmentsToSrt(segments: SubtitleSegment[]): string {
  return segments.map((seg, i) => {
    const toSrtTime = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.round((sec % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };
    return `${i + 1}\n${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}\n${seg.text}\n`;
  }).join("\n");
}
