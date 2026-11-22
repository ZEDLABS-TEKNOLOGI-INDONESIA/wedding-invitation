interface RateLimitEntry {
  timestamps: number[];
  windowMs: number;
}

const requestLog = new Map<string, RateLimitEntry>();
const MAX_TRACKED_KEYS = 5000;

const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export const getClientIp = (
  request: Request,
  clientAddress?: string
): string => {
  const directIp = clientAddress?.trim() || "";
  if (!directIp || LOOPBACK_ADDRESSES.has(directIp)) {
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;

    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      const firstIp = forwardedFor.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }
  }
  return directIp || "unknown";
};

const pruneStaleEntries = (now: number) => {
  for (const [key, entry] of requestLog.entries()) {
    const recent = entry.timestamps.filter((t) => now - t < entry.windowMs);
    if (recent.length === 0) {
      requestLog.delete(key);
    } else if (recent.length !== entry.timestamps.length) {
      entry.timestamps = recent;
    }
  }

  while (requestLog.size >= MAX_TRACKED_KEYS) {
    const oldestKey = requestLog.keys().next().value;
    if (oldestKey === undefined) break;
    requestLog.delete(oldestKey);
  }
};

export const checkRateLimit = (
  key: string,
  limit: number = 5,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const entry = requestLog.get(key);
  const recentRequests = entry
    ? entry.timestamps.filter((time) => now - time < windowMs)
    : [];

  if (recentRequests.length >= limit) {
    requestLog.set(key, { timestamps: recentRequests, windowMs });
    return false;
  }

  if (requestLog.size >= MAX_TRACKED_KEYS && !requestLog.has(key)) {
    pruneStaleEntries(now);
  }

  recentRequests.push(now);
  // Delete and re-insert to refresh insertion order (LRU/FIFO eviction)
  requestLog.delete(key);
  requestLog.set(key, { timestamps: recentRequests, windowMs });

  return true;
};
