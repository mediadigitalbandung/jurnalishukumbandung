export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { aiRateLimit } from "@/lib/rate-limit";
import { callAI, hasAIKey } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";

const BASE_SYSTEM_PROMPT =
  "Kamu adalah proofreader profesional untuk media berita hukum Indonesia. Tugasmu: perbaiki HANYA typo, ejaan salah (EYD/EBI), dan kesalahan tanda baca. JANGAN ubah struktur kalimat, gaya penulisan, atau makna. JANGAN hapus/tambah konten. Pertahankan semua tag HTML persis seperti aslinya. Jangan ubah istilah hukum (KUHP, KUHAP, UU, Pasal, dll.), nama orang, nama tempat, atau istilah asing yang sengaja dipakai.";

async function buildSystemPrompt(): Promise<string> {
  try {
    const entries = await prisma.dictionaryEntry.findMany({
      select: { originalWord: true, word: true },
      take: 500, // cap at 500 to avoid prompt bloat
    });
    if (entries.length === 0) return BASE_SYSTEM_PROMPT;

    const whitelist = entries
      .map((e) => e.originalWord || e.word)
      .filter(Boolean)
      .join(", ");

    return `${BASE_SYSTEM_PROMPT}\n\nKAMUS JHB (JANGAN PERNAH UBAH kata-kata berikut, anggap benar semua): ${whitelist}`;
  } catch {
    return BASE_SYSTEM_PROMPT;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    // Rate limit per user
    const { success: allowed } = aiRateLimit(session.user.id);
    if (!allowed) {
      throw new ApiError("Batas penggunaan AI tercapai (20 request/jam). Coba lagi nanti.", 429);
    }

    const body = await req.json();
    const { content } = body as { content: string };

    if (!content || typeof content !== "string") {
      throw new ApiError("Field content wajib diisi", 400);
    }
    if (content.length < 20) {
      throw new ApiError("Konten terlalu pendek untuk dikoreksi", 400);
    }
    if (content.length > 30000) {
      throw new ApiError("Konten terlalu panjang (max 30000 karakter)", 400);
    }

    if (!(await hasAIKey())) {
      throw new ApiError("API Key AI belum dikonfigurasi", 400);
    }

    // Chunking for long content (split by paragraph to preserve context)
    const CHUNK_SIZE = 4000;
    const chunks: string[] = [];
    if (content.length <= CHUNK_SIZE) {
      chunks.push(content);
    } else {
      // Split by </p> or <br> boundaries
      const paragraphs = content.split(/(<\/p>|<br\s*\/?>)/gi);
      let buffer = "";
      for (const p of paragraphs) {
        if ((buffer + p).length > CHUNK_SIZE && buffer) {
          chunks.push(buffer);
          buffer = p;
        } else {
          buffer += p;
        }
      }
      if (buffer) chunks.push(buffer);
    }

    const systemPrompt = await buildSystemPrompt();

    const fixedChunks: string[] = [];
    for (const chunk of chunks) {
      const prompt = `Perbaiki typo dan ejaan pada konten HTML berikut. Kembalikan HANYA konten HTML yang sudah diperbaiki, tanpa penjelasan, tanpa markdown wrapper. Pertahankan semua tag HTML.

KONTEN:
${chunk}`;

      const fixed = await callAI(systemPrompt, prompt, 3500, 90000);
      if (!fixed || fixed.trim().length === 0) {
        // If AI returns empty, use original chunk
        fixedChunks.push(chunk);
        continue;
      }
      // Strip common AI response wrappers (if any leaked)
      let cleaned = fixed.trim();
      cleaned = cleaned.replace(/^```(html)?\s*/i, "").replace(/\s*```$/, "");
      cleaned = cleaned.replace(/^HASIL.*?:\s*/i, "");
      fixedChunks.push(cleaned);
    }

    const result = fixedChunks.join("");

    // Compute simple diff stats
    const diffCount = countDiffs(content, result);

    return successResponse({
      original: content,
      fixed: result,
      changesCount: diffCount,
      charDiff: result.length - content.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Rough estimate of word-level changes between two strings */
function countDiffs(a: string, b: string): number {
  const stripA = a.replace(/<[^>]*>/g, "").toLowerCase();
  const stripB = b.replace(/<[^>]*>/g, "").toLowerCase();
  const wordsA = stripA.split(/\s+/).filter(Boolean);
  const wordsB = stripB.split(/\s+/).filter(Boolean);
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let changes = 0;
  setA.forEach((w) => { if (!setB.has(w)) changes++; });
  setB.forEach((w) => { if (!setA.has(w)) changes++; });
  return Math.ceil(changes / 2); // rough: each change = 1 removed + 1 added
}
