import Link from "next/link";
import Image from "next/image";
import { truncate } from "@/lib/utils";

interface ArticleCardProps {
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category: { name: string; slug: string };
  author: { name: string };
  publishedAt: Date | string | null;
  readTime?: number | null;
  viewCount?: number;
  verificationLabel?: string;
  variant?: "hero" | "standard" | "compact" | "headline" | "default" | "featured";
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m yang lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}j yang lalu`;
  return formatDate(date);
}

export default function ArticleCard({
  title,
  slug,
  excerpt,
  featuredImage,
  category,
  author,
  publishedAt,
  readTime,
  viewCount,
  verificationLabel = "UNVERIFIED",
  variant = "standard",
}: ArticleCardProps) {
  /* ── Hero variant (large featured card — ABC News style) ── */
  if (variant === "hero" || variant === "featured") {
    return (
      <article className="group">
        <Link href={`/berita/${slug}`} className="block">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-sm">
            {featuredImage ? (
              <Image
                src={featuredImage}
                alt={title}
                fill
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="h-full w-full bg-surface-secondary" />
            )}
          </div>
        </Link>
        <div className="mt-3">
          <Link
            href={`/kategori/${category.slug}`}
            className="text-xs font-bold uppercase tracking-wide text-goto-green"
          >
            {category.name}
          </Link>
          <Link href={`/berita/${slug}`}>
            <h2 className="mt-1 font-serif text-lg font-bold leading-tight text-txt-primary hover:underline sm:text-xl lg:text-2xl">
              {title}
            </h2>
          </Link>
          {excerpt && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-txt-secondary">
              {truncate(excerpt, 200)}
            </p>
          )}
          <p className="mt-2 text-xs text-txt-muted">
            {formatTime(publishedAt)}
            <span className="mx-1">&middot;</span>
            {author.name}
          </p>
        </div>
      </article>
    );
  }

  /* ── Compact variant (horizontal small card) ── */
  if (variant === "compact") {
    return (
      <article className="group flex gap-3">
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-sm">
          {featuredImage ? (
            <Image
              src={featuredImage}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-surface-secondary" />
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center min-w-0">
          <Link
            href={`/berita/${slug}`}
            className="line-clamp-2 text-sm font-semibold leading-snug text-txt-primary hover:underline"
          >
            {title}
          </Link>
          <p className="mt-1 text-xs text-txt-muted">
            {formatTime(publishedAt)}
          </p>
        </div>
      </article>
    );
  }

  /* ── Headline variant (text-only, for "Just In" lists) ── */
  if (variant === "headline") {
    return (
      <article className="border-b border-border pb-3">
        <Link
          href={`/kategori/${category.slug}`}
          className="text-xs font-bold uppercase tracking-wide text-goto-green"
        >
          {category.name}
        </Link>
        <Link href={`/berita/${slug}`}>
          <h3 className="mt-0.5 font-serif text-sm font-semibold leading-snug text-txt-primary hover:underline">
            {title}
          </h3>
        </Link>
        <p className="mt-1 text-xs text-txt-muted">
          {formatTime(publishedAt)}
        </p>
      </article>
    );
  }

  /* ── Standard / Default variant (medium vertical card — clean, no border/shadow) ── */
  return (
    <article className="group">
      <Link href={`/berita/${slug}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-sm">
          {featuredImage ? (
            <Image
              src={featuredImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="h-full w-full bg-surface-secondary" />
          )}
        </div>
      </Link>
      <div className="mt-2">
        <Link
          href={`/kategori/${category.slug}`}
          className="text-xs font-bold uppercase tracking-wide text-goto-green"
        >
          {category.name}
        </Link>
        <Link href={`/berita/${slug}`}>
          <h3 className="mt-1 font-serif line-clamp-2 text-base font-bold leading-snug text-txt-primary hover:underline">
            {title}
          </h3>
        </Link>
        <p className="mt-2 text-xs text-txt-muted">
          {formatTime(publishedAt)}
          <span className="mx-1">&middot;</span>
          {author.name}
        </p>
      </div>
    </article>
  );
}
