import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireRole } from "@/lib/api-utils";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["SUPER_ADMIN", "EDITOR"]);
  if (!authResult.success) return errorResponse(authResult.error || "Unauthorized", 403);

  try {
    const body = await request.json();
    const { articleId } = body;
    if (!articleId) return errorResponse("articleId wajib diisi", 400);

    // Check if poll already exists for this article
    const existingPoll = await prisma.poll.findUnique({
      where: { articleId },
      include: { options: { select: { id: true, label: true, votes: true } } },
    });
    if (existingPoll) {
      return errorResponse("Polling untuk artikel ini sudah ada", 409);
    }

    // Fetch article
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        categoryId: true,
      },
    });
    if (!article) return errorResponse("Artikel tidak ditemukan", 404);

    // Generate poll using Claude AI
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Kamu adalah asisten jurnalis hukum. Berdasarkan artikel berita hukum berikut, buatlah 1 pertanyaan polling yang menarik untuk pembaca dan 4 pilihan jawaban yang relevan.

Judul artikel: ${article.title}${article.excerpt ? `\nRingkasan: ${article.excerpt}` : ""}

Aturan:
- Pertanyaan harus singkat, maksimal 120 karakter
- Pertanyaan harus mendorong pembaca untuk berpendapat tentang isu hukum ini
- 4 pilihan jawaban yang beragam perspektifnya, masing-masing maksimal 50 karakter
- Gunakan Bahasa Indonesia yang baik

Balas HANYA dalam format JSON berikut tanpa penjelasan apapun:
{"question":"pertanyaan polling","options":["pilihan 1","pilihan 2","pilihan 3","pilihan 4"]}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Parse AI response
    let pollData: { question: string; options: string[] };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      pollData = JSON.parse(jsonMatch[0]);
      if (
        !pollData.question ||
        !Array.isArray(pollData.options) ||
        pollData.options.length < 2
      ) {
        throw new Error("Invalid structure");
      }
    } catch {
      return errorResponse("AI gagal generate pertanyaan polling", 500);
    }

    // Create poll linked to article
    const poll = await prisma.poll.create({
      data: {
        question: pollData.question.slice(0, 300),
        image: article.featuredImage || null,
        categoryId: article.categoryId || null,
        articleId: article.id,
        isActive: true,
        options: {
          create: pollData.options
            .slice(0, 4)
            .map((label: string) => ({ label: label.slice(0, 100) })),
        },
      },
      include: {
        options: { select: { id: true, label: true, votes: true } },
      },
    });

    return successResponse(poll, "Polling berhasil dibuat dari artikel");
  } catch (err) {
    console.error("[from-article]", err);
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

// GET: check if article already has a poll
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");
  if (!articleId) return errorResponse("articleId wajib diisi", 400);

  const poll = await prisma.poll.findUnique({
    where: { articleId },
    include: {
      options: { select: { id: true, label: true, votes: true } },
    },
  });

  return successResponse({ poll: poll || null });
}
