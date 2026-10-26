// A small sliding-window limiter kept in memory. Each server instance counts on its own, so it stops a single bot hammering
// the form but isn't an exact global count; a shared store (the database) would be the next step if that ever matters.
type Rule = { limit: number; windowMs: number };

const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

function prune(now: number) {
  for (const [key, times] of hits) {
    if (times.length === 0 || now - times[times.length - 1] > 24 * 60 * 60 * 1000) hits.delete(key);
  }
}

// Records an attempt under `key` and says whether it fits every rule. The attempt only counts when it is allowed.
export function checkRateLimit(key: string, rules: Rule[]): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (hits.size > MAX_KEYS) prune(now);

  const longest = Math.max(...rules.map((rule) => rule.windowMs));
  const times = (hits.get(key) ?? []).filter((time) => now - time < longest);

  for (const { limit, windowMs } of rules) {
    const inWindow = times.filter((time) => now - time < windowMs);
    if (inWindow.length >= limit) {
      const retryAfterMs = windowMs - (now - inWindow[inWindow.length - limit]);
      hits.set(key, times);
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }
  }

  times.push(now);
  hits.set(key, times);
  return { ok: true, retryAfterSeconds: 0 };
}

// Vercel sets these from the real connection, so they can be trusted there; locally they're usually absent.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0];
  return forwarded?.trim() || "unknown";
}
