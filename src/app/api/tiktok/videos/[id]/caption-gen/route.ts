import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { generateTiktokCaption } from "@/lib/tiktok/caption-gen";

export const dynamic = "force-dynamic";

/** POST /api/tiktok/videos/:id/caption-gen — AI generate caption + hashtag */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      include: { article: { select: { title: true, excerpt: true, content: true } } },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    const result = await generateTiktokCaption({
      articleTitle: video.article?.title || video.title,
      articleExcerpt: video.article?.excerpt || undefined,
      articleContent: video.article?.content || undefined,
    });

    // Save langsung ke DB supaya user bisa melihat langsung di UI setelah reload
    await prisma.tiktokVideo.update({
      where: { id: params.id },
      data: {
        caption: result.caption,
        hashtags: result.hashtags,
      },
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
