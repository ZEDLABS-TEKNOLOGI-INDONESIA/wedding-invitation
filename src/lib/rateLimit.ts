const requestLog = new Map<string, number[]>();

export const checkRateLimit = (
  ip: string,
  limit: number = 5,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const timestamps = requestLog.get(ip) || [];
  const recentRequests = timestamps.filter((time) => now - time < windowMs);

  if (recentRequests.length >= limit) {
    return false;
  }
  recentRequests.push(now);
  requestLog.set(ip, recentRequests);
  if (requestLog.size > 1000) requestLog.clear();

  return true;
};
