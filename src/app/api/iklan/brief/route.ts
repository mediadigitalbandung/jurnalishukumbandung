/**
 * POST /api/iklan/brief
 *
 * Generate Claude Design prompt dari brief iklan.
 * Returns: { prompt, slotSpec, recommendedDimensions }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { generateClaudeDesignPrompt, SLOT_SPECS, type AdBriefInput } from "@/lib/iklan/ad-brief-prompt";

export const dynamic = "force-dynamic";

const briefSchema = z.object({
  clientName: z.string().min(1).max(100),
  productOrService: z.string().min(1).max(200),
  mainMessage: z.string().min(1).max(500),
  callToAction: z.string().min(1).max(50),
  targetUrl: z.string().url().max(500),
  slot: z.enum(["HEADER", "SIDEBAR", "IN_ARTICLE", "FOOTER", "BETWEEN_SECTIONS", "POPUP", "FLOATING_BOTTOM"]),
  brandColors: z.array(z.string().max(20)).max(6).optional(),
  brandFonts: z.array(z.string().max(50)).max(3).optional(),
  styleHint: z.string().max(100).optional(),
  additionalNotes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();
    const data = briefSchema.parse(body) as AdBriefInput;

    const prompt = generateClaudeDesignPrompt(data);
    const slotSpec = SLOT_SPECS[data.slot];

    return successResponse({
      prompt,
      slotSpec,
      recommendedDimensions: `${slotSpec.width}×${slotSpec.height}px`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
