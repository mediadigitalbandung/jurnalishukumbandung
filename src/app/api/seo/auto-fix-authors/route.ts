/**
 * Auto-fix author E-E-A-T signals: generates professional bio + sets avatar
 * for users missing them. Critical for Google ranking — articles inherit
 * author authority signal via JSON-LD `Person` schema.
 *
 * POST /api/seo/auto-fix-authors
 *   Headers: Authorization: Bearer ${CRON_SECRET}
 *   Body: { dryRun?: boolean, useAvatarPlaceholder?: boolean (default true) }
 *
 * Bio: AI-generated based on author's article topics + role + JHB context.
 * Avatar: ui-avatars.com placeholder URL (initials on colored background) if missing.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";

const bodySchema = z.object({
  dryRun: z.boolean().optional().default(false),
  useAvatarPlaceholder: z.boolean().optional().default(true),
});

const SYSTEM_PROMPT = `Kamu adalah PR specialist untuk media berita hukum Indonesia "Jurnalis Hukum Bandung" (JHB).
Tugas: tulis professional bio penulis (80-150 karakter) yang membangun otoritas (E-E-A-T signal untuk Google).

ATURAN bio:
- 80-150 karakter (strict)
- Mention area keahlian (hukum pidana, perdata, jurnalistik, dll)
- Sebut JHB sebagai outlet
- Tone profesional jurnalistik (bukan personal blog)
- Kalau role EDITOR/SUPER_ADMIN: emphasize editorial leadership
- Kalau role JOURNALIST: emphasize beat coverage
- Hindari klaim spesifik tahun pengalaman kalau tidak ada data

Output FORMAT (JSON valid only):
{"bio": "..."}`;

interface AuthorTopic {
  category: string;
  count: number;
}

function buildAvatarUrl(name: string): string {
  // ui-avatars.com — server-side rendered initials avatar
  // Pakai brand JHB colors: green background (#00AA13)
  const cleanName = encodeURIComponent(name.slice(0, 30));
  return `https://ui-avatars.com/api/?name=${cleanName}&size=256&background=00AA13&color=FFFFFF&font-size=0.4&bold=true&format=png`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { dryRun, useAvatarPlaceholder } = bodySchema.parse(body);

    if (!(await hasAIKey())) {
      return NextResponse.json({ error: "No AI key configured" }, { status: 503 });
    }

    // Get all users that have published articles
    const authors = await prisma.user.findMany({
      where: {
        articles: { some: { status: "PUBLISHED" } },
      },
      select: {
        id: true,
        name: true,
        role: true,
        bio: true,
        avatar: true,
        specialization: true,
        articles: {
          where: { status: "PUBLISHED" },
          select: { category: { select: { name: true } } },
          take: 50,
        },
      },
    });

    const samples: Array<{
      name: string;
      role: string;
      articles: number;
      bioBefore: string | null;
      bioAfter: string;
      avatarBefore: string | null;
      avatarAfter: string;
    }> = [];

    let bioFixed = 0;
    let avatarFixed = 0;
    let skipped = 0;

    for (const author of authors) {
      const needsBio = !author.bio || author.bio.length < 50;
      const needsAvatar = !author.avatar;

      if (!needsBio && !needsAvatar) {
        skipped++;
        continue;
      }

      let newBio: string | null = null;
      let newAvatar: string | null = null;

      // Generate bio
      if (needsBio) {
        // Aggregate topics from articles
        const categoryCount = new Map<string, number>();
        for (const a of author.articles) {
          const cat = a.category?.name || "Umum";
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
        }
        const topics: AuthorTopic[] = Array.from(categoryCount.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        const topicsList = topics.map((t) => `${t.category} (${t.count} artikel)`).join(", ");
        const userPrompt = `NAMA: ${author.name}
ROLE: ${author.role}
JUMLAH ARTIKEL: ${author.articles.length}
TOPIK UTAMA: ${topicsList}
${author.specialization ? `SPESIALISASI: ${author.specialization}` : ""}

Generate bio profesional 80-150 karakter. Output JSON.`;

        try {
          const aiResponse = await callAI(SYSTEM_PROMPT, userPrompt, 300, 30000);
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as { bio?: string };
            if (parsed.bio && parsed.bio.length >= 50) {
              newBio = parsed.bio.slice(0, 200).trim();
            }
          }
        } catch (err) {
          console.error(`[auto-fix-authors] AI error for ${author.name}:`, err);
        }
      }

      // Generate avatar URL placeholder
      if (needsAvatar && useAvatarPlaceholder) {
        newAvatar = buildAvatarUrl(author.name);
      }

      const updateData: { bio?: string; avatar?: string } = {};
      if (newBio) updateData.bio = newBio;
      if (newAvatar) updateData.avatar = newAvatar;

      if (Object.keys(updateData).length === 0) {
        skipped++;
        continue;
      }

      if (samples.length < 10) {
        samples.push({
          name: author.name,
          role: author.role,
          articles: author.articles.length,
          bioBefore: author.bio,
          bioAfter: newBio || (author.bio ?? ""),
          avatarBefore: author.avatar,
          avatarAfter: newAvatar || (author.avatar ?? ""),
        });
      }

      if (!dryRun) {
        await prisma.user.update({
          where: { id: author.id },
          data: updateData,
        });
      }

      if (newBio) bioFixed++;
      if (newAvatar) avatarFixed++;

      // Rate limit AI calls
      if (newBio) await new Promise((r) => setTimeout(r, 1500));
    }

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      dryRun,
      authorsScanned: authors.length,
      bioFixed,
      avatarFixed,
      skipped,
      samples,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
