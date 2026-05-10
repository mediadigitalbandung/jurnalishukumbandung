import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, ApiError } from "@/lib/api-utils";
import { callAI } from "@/lib/ai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Anda adalah jurnalis hukum berpengalaman yang menulis ulang artikel hukum agar mudah dipahami pembaca awam (bukan praktisi hukum).

Tugas Anda:
1. Tulis ulang seluruh artikel dalam bahasa Indonesia yang jelas, sederhana, dan ringan — seperti menjelaskan kepada teman.
2. Hindari jargon hukum. Kalau harus pakai (misal: "praperadilan", "tipikor", "kasasi"), jelaskan dalam tanda kurung.
3. Pakai kalimat pendek (max 20 kata), paragraf pendek (max 3 kalimat).
4. Tetap pertahankan: fakta utama, nama orang/instansi, angka, tanggal, kutipan langsung.
5. Pertahankan struktur HTML dasar (<p>, <h2>, <h3>, <ul>, <li>, <strong>). JANGAN tambah class CSS atau atribut styling.
6. JANGAN tambah opini atau interpretasi baru. JANGAN ubah substansi/fakta.
7. Pertahankan urutan informasi penting (5W1H di awal).
8. Output: hanya HTML rewritten, tidak ada preamble, tidak ada penjelasan.`;

function truncateContent(html: string, maxChars = 12000): string {
  if (html.length <= maxChars) return html;
  return html.slice(0, maxChars) + "\n\n[...artikel dipotong, generasi versi awam akan mencakup bagian utama saja...]";
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        content: true,
        versiAwam: true,
        versiAwamGeneratedAt: true,
        updatedAt: true,
      },
    });

    if (!article) throw new ApiError("Artikel tidak ditemukan", 404);

    // Return cached version if fresh enough (cache valid until article updated)
    if (
      article.versiAwam &&
      article.versiAwamGeneratedAt &&
      article.versiAwamGeneratedAt >= article.updatedAt
    ) {
      return successResponse({
        versiAwam: article.versiAwam,
        cached: true,
        generatedAt: article.versiAwamGeneratedAt,
      });
    }

    const userPrompt = `Judul: ${article.title}\n\nIsi artikel (HTML):\n${truncateContent(article.content)}`;
    const generated  = await callAI(SYSTEM_PROMPT, userPrompt, 4000, 50000);

    if (!generated || generated.length < 100) {
      throw new ApiError("AI tidak menghasilkan versi awam yang valid", 502);
    }

    await prisma.article.update({
      where: { id: params.id },
      data: {
        versiAwam: generated,
        versiAwamGeneratedAt: new Date(),
      },
    });

    return successResponse({
      versiAwam: generated,
      cached: false,
      generatedAt: new Date(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: params.id },
      select: { versiAwam: true, versiAwamGeneratedAt: true, updatedAt: true },
    });
    if (!article?.versiAwam) {
      return successResponse({ versiAwam: null, cached: false });
    }
    const stale = article.versiAwamGeneratedAt
      ? article.versiAwamGeneratedAt < article.updatedAt
      : true;
    return successResponse({
      versiAwam: stale ? null : article.versiAwam,
      cached: !stale,
      generatedAt: article.versiAwamGeneratedAt,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
