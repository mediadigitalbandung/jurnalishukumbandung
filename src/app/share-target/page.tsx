import { redirect } from "next/navigation";
import Link from "next/link";
import { Share2, FileText, Search, Plus } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface SearchParams {
  title?: string;
  text?: string;
  url?: string;
}

export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  const { title = "", text = "", url = "" } = searchParams;

  // Aggregate all shared content into a single search/draft string
  const combined = [title, text, url].filter(Boolean).join(" ").trim();

  // If user is logged in as editor/journalist, offer to create draft
  const canCreateDraft = session?.user && ["SUPER_ADMIN", "EDITOR", "JOURNALIST"].includes(session.user.role);

  // If shared content includes a JHB url, redirect straight to that article
  if (url && url.includes("jurnalishukumbandung.com")) {
    try {
      const u = new URL(url);
      if (u.pathname.startsWith("/berita/") || u.pathname.startsWith("/kategori/")) {
        redirect(u.pathname + u.search);
      }
    } catch { /* invalid URL, fall through */ }
  }

  return (
    <div className="bg-surface min-h-[70vh]">
      <div className="container-main max-w-2xl py-12">
        <div className="mb-8 text-center">
          <div className="bg-goto-light mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Share2 className="text-goto-green h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-txt-primary">
            Konten dibagikan ke JHB
          </h1>
          <p className="mt-2 text-sm text-txt-secondary">
            Pilih apa yang ingin Anda lakukan dengan konten yang dibagikan.
          </p>
        </div>

        {/* Preview shared content */}
        <div className="card mb-6 p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-txt-muted">
            Preview konten
          </p>
          {title && <p className="font-semibold text-txt-primary">{title}</p>}
          {text && <p className="mt-1 text-sm text-txt-secondary line-clamp-4">{text}</p>}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block break-all text-xs text-goto-green hover:underline"
            >
              {url}
            </a>
          )}
          {!title && !text && !url && (
            <p className="text-sm text-txt-muted">Tidak ada konten yang diterima.</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Search JHB for shared content */}
          {combined && (
            <Link
              href={`/search?q=${encodeURIComponent(combined.slice(0, 200))}`}
              className="card flex items-center gap-3 p-4 transition-colors hover:bg-goto-light"
            >
              <Search className="h-5 w-5 text-goto-green" />
              <div className="flex-1">
                <p className="font-semibold text-txt-primary">Cari di JHB</p>
                <p className="text-xs text-txt-secondary">
                  Cari berita hukum terkait dari konten yang dibagikan
                </p>
              </div>
            </Link>
          )}

          {/* Create draft (admin only) */}
          {canCreateDraft && (
            <Link
              href={`/panel/artikel/baru?title=${encodeURIComponent(title)}&excerpt=${encodeURIComponent(text)}&source=${encodeURIComponent(url)}`}
              className="card flex items-center gap-3 p-4 transition-colors hover:bg-goto-light"
            >
              <Plus className="h-5 w-5 text-goto-green" />
              <div className="flex-1">
                <p className="font-semibold text-txt-primary">Buat draft artikel</p>
                <p className="text-xs text-txt-secondary">
                  Mulai draft baru di panel redaksi dengan konten ini sebagai sumber
                </p>
              </div>
            </Link>
          )}

          {/* Browse */}
          <Link
            href="/berita"
            className="card flex items-center gap-3 p-4 transition-colors hover:bg-goto-light"
          >
            <FileText className="h-5 w-5 text-goto-green" />
            <div className="flex-1">
              <p className="font-semibold text-txt-primary">Jelajahi berita</p>
              <p className="text-xs text-txt-secondary">
                Lihat berita hukum terbaru di JHB
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
