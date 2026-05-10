import Image from "next/image";

interface Props {
  /** Optional category name to display as a badge over the placeholder */
  category?: string;
  /** Variant — "card" for full-bleed featured cards, "thumb" for small list thumbnails */
  variant?: "card" | "thumb";
  className?: string;
}

/**
 * Light-themed placeholder shown when an article has no featuredImage.
 * Replaces the previous bg-surface-dark which produced jarring black blocks
 * across the homepage when many articles lacked images.
 */
export default function NoImagePlaceholder({
  category,
  variant = "card",
  className = "",
}: Props) {
  if (variant === "thumb") {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-goto-light to-surface-secondary ${className}`}
        aria-hidden="true"
      >
        <Image
          src="/icon-192.png"
          alt=""
          width={28}
          height={28}
          className="opacity-60"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-goto-light via-surface-secondary to-surface-tertiary ${className}`}
      aria-hidden="true"
    >
      <Image
        src="/icon-192.png"
        alt=""
        width={56}
        height={56}
        className="opacity-50"
      />
      {category && (
        <span className="mt-2 rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-goto-dark">
          {category}
        </span>
      )}
    </div>
  );
}
