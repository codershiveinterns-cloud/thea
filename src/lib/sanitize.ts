/**
 * Output sanitisation helpers. Markdown never renders raw HTML (react-markdown skipHtml),
 * and every link/image URL that reaches the DOM passes through safeUrl().
 */

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

/**
 * Allow http(s), mailto, same-site paths, anchors and relative links; drop everything else
 * (javascript:, data:, vbscript:, file: ...). Returns "" so react-markdown renders no href/src.
 */
export function safeUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("//")) return "";
  if (/^[#/?]/.test(trimmed)) return trimmed;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed; // relative path, no scheme
  try {
    const u = new URL(trimmed);
    return SAFE_PROTOCOLS.includes(u.protocol) ? u.toString() : "";
  } catch {
    return "";
  }
}

/** Strip control characters (except tab/newline/CR) that occasionally leak from feeds or model output. */
export function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

/** Truncate for logs/UI without cutting a surrogate pair. */
export function truncate(text: string, max = 200): string {
  return text.length <= max ? text : `${Array.from(text).slice(0, max).join("")}...`;
}
