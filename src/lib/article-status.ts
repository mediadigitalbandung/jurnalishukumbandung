// Shared article status configuration — used by dashboard, artikel list, and other admin pages.
// Keeping a single source of truth prevents drift between statusColors/statusLabels across files.

export const ARTICLE_STATUS_LIST = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
] as const;

export type ArticleStatus = typeof ARTICLE_STATUS_LIST[number];

// Tailwind classes untuk badge warna status
export const statusColors: Record<string, string> = {
  PUBLISHED: "bg-goto-light text-goto-green",
  IN_REVIEW: "bg-yellow-50 text-yellow-600",
  APPROVED: "bg-blue-50 text-blue-600",
  DRAFT: "bg-surface-tertiary text-txt-secondary",
  REJECTED: "bg-red-50 text-red-600",
  ARCHIVED: "bg-surface-tertiary text-txt-muted",
};

// Label bahasa Indonesia untuk setiap status
export const statusLabels: Record<string, string> = {
  PUBLISHED: "Dipublikasi",
  IN_REVIEW: "Menunggu Review",
  APPROVED: "Disetujui",
  DRAFT: "Draf",
  REJECTED: "Ditolak",
  ARCHIVED: "Diarsipkan",
};

// Progress timeline order — used by article detail page to show status progression
export const PROGRESS_STEPS = ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED"] as const;

export const stepLabels: Record<string, string> = {
  DRAFT: "Draf",
  IN_REVIEW: "Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Dipublikasi",
};
