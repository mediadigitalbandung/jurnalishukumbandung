/**
 * Helper untuk menyembunyikan nama SUPER_ADMIN di halaman publik.
 * Super Admin selalu ditampilkan sebagai "Redaksi" — baik sebagai penulis,
 * editor, reviewer, atau co-author.
 */

export const EDITORIAL_BYLINE = "Redaksi";

type UserLike = { name: string; role?: string | null } | null | undefined;

/** Return display name — "Redaksi" kalau SUPER_ADMIN, selain itu pakai nama asli */
export function displayName(user: UserLike): string {
  if (!user) return EDITORIAL_BYLINE;
  if (user.role === "SUPER_ADMIN") return EDITORIAL_BYLINE;
  return user.name;
}

/** True kalau user adalah SUPER_ADMIN (harus di-redakte) */
export function isEditorialRole(user: UserLike): boolean {
  return user?.role === "SUPER_ADMIN";
}

/** Replace nama user di objek — untuk mutate data sebelum render */
export function normalizeUser<T extends { name: string; role?: string | null }>(user: T): T {
  if (user.role === "SUPER_ADMIN") {
    return { ...user, name: EDITORIAL_BYLINE };
  }
  return user;
}

/** Replace author.name di objek article */
export function normalizeArticleAuthor<
  T extends { author?: { name: string; role?: string | null } | null } | null | undefined
>(article: T): T {
  if (!article) return article;
  const author = (article as any).author;
  if (author && author.role === "SUPER_ADMIN") {
    return { ...article, author: { ...author, name: EDITORIAL_BYLINE } } as T;
  }
  return article;
}

/** Replace author.name di array of articles */
export function normalizeArticles<
  T extends { author?: { name: string; role?: string | null } | null }
>(articles: T[]): T[] {
  return articles.map((a) => normalizeArticleAuthor(a)) as T[];
}
