/** Find the active jhb-pages cache name regardless of version (jhb-pages-v5/v6/...) */
export async function getPageCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    const keys = await caches.keys();
    const pageCacheName = keys.find((k) => k.startsWith("jhb-pages-"));
    if (!pageCacheName) return null;
    return await caches.open(pageCacheName);
  } catch {
    return null;
  }
}

/** Check if a URL is currently cached for offline reading */
export async function isOfflineReady(url: string): Promise<boolean> {
  const cache = await getPageCache();
  if (!cache) return false;
  const hit = await cache.match(url);
  return !!hit;
}
