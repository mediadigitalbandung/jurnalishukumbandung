export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

const VAULT_DIR = path.resolve(process.cwd(), "docs/vault");

function countFilesByDir(dir: string): { count: number; latest: string | null } {
  if (!fs.existsSync(dir)) return { count: 0, latest: null };
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md") && !f.startsWith("."));
  let latest: { name: string; mtime: number } | null = null;
  for (const f of files) {
    const stat = fs.statSync(path.join(dir, f));
    if (!latest || stat.mtimeMs > latest.mtime) {
      latest = { name: f, mtime: stat.mtimeMs };
    }
  }
  return { count: files.length, latest: latest ? new Date(latest.mtime).toISOString() : null };
}

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const exists = fs.existsSync(VAULT_DIR);
    if (!exists) return successResponse({ exists: false });

    const folders = {
      kasus: countFilesByDir(path.join(VAULT_DIR, "01-Kasus")),
      narasumber: countFilesByDir(path.join(VAULT_DIR, "02-Narasumber")),
      pasal: countFilesByDir(path.join(VAULT_DIR, "03-Hukum/Pasal")),
      yurisprudensi: countFilesByDir(path.join(VAULT_DIR, "03-Hukum/Yurisprudensi")),
      topik: countFilesByDir(path.join(VAULT_DIR, "04-Topik-Riset")),
      dailyLog: countFilesByDir(path.join(VAULT_DIR, "05-Editorial/Daily-Log")),
      sidang: countFilesByDir(path.join(VAULT_DIR, "06-Sidang")),
      drafts: countFilesByDir(path.join(VAULT_DIR, "07-Drafts")),
      sosmed: countFilesByDir(path.join(VAULT_DIR, "08-Sosmed-Plan")),
      templates: countFilesByDir(path.join(VAULT_DIR, "09-Templates")),
    };

    const totalFiles = Object.values(folders).reduce((s, f) => s + f.count, 0);

    return successResponse({
      exists: true,
      vaultPath: VAULT_DIR,
      totalFiles,
      folders,
      lastSync: Object.values(folders)
        .map(f => f.latest)
        .filter((x): x is string => !!x)
        .sort()
        .pop() || null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
