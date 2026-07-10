// api/_lib/rateLimit.js
// Lightweight in-memory rate limiter for Vercel serverless functions.
//
// Vercel reuses a warm container across invocations for ~5 minutes (see
// api/predict.py), so a module-level Map survives across requests within
// that window and gives real protection against a burst of calls hitting
// the paid Groq API. It does NOT protect against a determined attacker
// spread across many cold-started/concurrent instances — each instance
// has its own Map. That's an accepted tradeoff for a low-traffic student
// project: it stops accidental cost spirals and casual abuse for free,
// without provisioning an external store (Redis/KV).

const buckets = new Map(); // key -> { count, resetAt }

// Opportunistic cleanup so the Map doesn't grow unbounded within a warm
// container's lifetime.
function sweep(now) {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

function getClientKey(req) {
  const fwd = req.headers?.["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
  return ip || req.socket?.remoteAddress || "unknown";
}

// Returns true and sends a 429 if the caller is over the limit; otherwise
// returns false and the caller should proceed.
export function isRateLimited(req, res, { routeName, windowMs = 5 * 60 * 1000, max = 10 }) {
  const now = Date.now();
  if (buckets.size > 500) sweep(now);

  const key = `${routeName}:${getClientKey(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= max) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: `Too many requests. Please wait ${retryAfterSec}s and try again.`,
    });
    return true;
  }

  bucket.count += 1;
  return false;
}
