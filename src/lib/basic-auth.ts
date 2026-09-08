/**
 * HTTP Basic Auth helpers for the admin. Pure and edge-safe (no Node imports) so the
 * middleware can use them and Vitest can test them.
 */

export type BasicCredentials = { user: string; password: string };

/** Parse an `Authorization: Basic base64(user:password)` header. Returns null when absent or malformed. */
export function parseBasicAuth(header: string | null | undefined): BasicCredentials | null {
  if (!header) return null;
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header.trim());
  if (!m) return null;
  let decoded: string;
  try {
    decoded = atob(m[1]);
  } catch {
    return null;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return null;
  return { user: decoded.slice(0, i), password: decoded.slice(i + 1) };
}

/** Constant-time string comparison (length is compared too, but without an early return on mismatch). */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export type AuthDecision = "allow" | "unauthorized" | "not-configured";

/**
 * Decide what the middleware should do.
 * - both env vars set → compare credentials
 * - vars unset in development → allow (local convenience)
 * - vars unset anywhere else → not-configured (fail closed with 503)
 */
export function decideBasicAuth(input: { header: string | null; user: string | undefined; password: string | undefined; nodeEnv: string | undefined }): AuthDecision {
  const user = input.user?.trim() ?? "";
  const password = input.password ?? "";
  if (!user || !password) return input.nodeEnv === "development" ? "allow" : "not-configured";
  const creds = parseBasicAuth(input.header);
  if (!creds) return "unauthorized";
  // Evaluate both comparisons so timing does not reveal which half failed.
  const userOk = safeEqual(creds.user, user);
  const passOk = safeEqual(creds.password, password);
  return userOk && passOk ? "allow" : "unauthorized";
}
