export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

const SCRIPTS_DIR = path.resolve(process.cwd(), "scripts/obsidian");

const ALLOWED_ACTIONS: Record<string, { script: string; label: string; allowedArgs?: string[] }> = {
  "sidang": { script: "export-sidang.js", label: "Export sidang", allowedArgs: ["--upcoming", "--force"] },
  "sidang-upcoming": { script: "export-sidang.js", label: "Export sidang (upcoming only)" },
  "keywords-pull": { script: "sync-keywords.js", label: "Pull keywords (DB → vault)" },
  "keywords-push": { script: "sync-keywords.js", label: "Push keywords (vault → DB)" },
  "keywords-status": { script: "sync-keywords.js", label: "Status keywords sync" },
  "daily-log": { script: "export-daily-digest.js", label: "Generate daily log" },
  "daily-log-7days": { script: "export-daily-digest.js", label: "Generate 7-day digest" },
  "narasumber": { script: "export-narasumber.js", label: "Pull narasumber dari Source table" },
  "narasumber-frequent": { script: "export-narasumber.js", label: "Pull narasumber (≥3 mentions)" },
};

const ARG_MAP: Record<string, string[]> = {
  "sidang-upcoming": ["--upcoming"],
  "keywords-pull": ["pull"],
  "keywords-push": ["push"],
  "keywords-status": ["status"],
  "daily-log-7days": ["--last-7-days"],
  "narasumber-frequent": ["--min-mentions=3"],
};

function runScript(scriptFile: string, args: string[], timeoutMs = 60000): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(SCRIPTS_DIR, scriptFile);
    const proc = spawn("node", [fullPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`Script timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? -1 });
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const body = await req.json();
    const action = String(body.action || "");
    const config = ALLOWED_ACTIONS[action];

    if (!config) {
      return errorResponse(new Error(`Unknown action: ${action}. Valid: ${Object.keys(ALLOWED_ACTIONS).join(", ")}`));
    }

    const args = ARG_MAP[action] || [];
    const startedAt = new Date();
    const result = await runScript(config.script, args, 90000);

    return successResponse({
      action,
      label: config.label,
      success: result.code === 0,
      exitCode: result.code,
      stdout: result.stdout.slice(-3000), // last 3KB
      stderr: result.stderr.slice(-1500),
      durationMs: Date.now() - startedAt.getTime(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
