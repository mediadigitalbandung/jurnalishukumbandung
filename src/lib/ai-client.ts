import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

export async function getAnthropicKey(): Promise<string | null> {
  try {
    const s = await prisma.systemSetting.findUnique({ where: { key: "anthropic_api_key" } });
    return s?.value || process.env.ANTHROPIC_API_KEY || null;
  } catch { return null; }
}

export async function getDeepSeekKey(): Promise<string | null> {
  try {
    const s = await prisma.systemSetting.findUnique({ where: { key: "deepseek_api_key" } });
    return s?.value || null;
  } catch { return null; }
}

export async function hasAIKey(): Promise<boolean> {
  const [a, d] = await Promise.all([getAnthropicKey(), getDeepSeekKey()]);
  return !!(a || d);
}

/**
 * Call AI: tries Anthropic (Claude Haiku) first, falls back to DeepSeek.
 * Fetches API keys from DB automatically.
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 500,
  timeoutMs = 30000
): Promise<string> {
  const [anthropicKey, deepseekKey] = await Promise.all([
    getAnthropicKey(),
    getDeepSeekKey(),
  ]);

  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey, timeout: timeoutMs });
      const msg = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const block = msg.content[0];
      if (block.type === "text" && block.text) return block.text.trim();
    } catch (err) {
      console.warn(
        "[AI] Anthropic failed, falling back to DeepSeek:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  if (!deepseekKey) {
    throw new Error("Tidak ada AI API key yang dikonfigurasi (anthropic_api_key atau deepseek_api_key)");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } finally {
    clearTimeout(timer);
  }
}
