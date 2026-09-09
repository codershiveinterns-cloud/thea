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

/** Element names that count as real HTML in markdown bodies. Anything else in <…> is treated as a placeholder. */
const HTML_TAGS = new Set(
  "a abbr address article aside audio b bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select slot small source span strong style sub summary sup svg table tbody td template textarea tfoot th thead time title tr track u ul var video wbr".split(" "),
);

const ANGLE_RE = /<(\/?)([A-Za-z][A-Za-z0-9-]*)([^<>]*)>/g;

/** True when the text contains a real HTML tag (not a placeholder like <username> or <Enter>). */
export function containsHtml(text: string): boolean {
  for (const m of text.matchAll(ANGLE_RE)) if (HTML_TAGS.has(m[2].toLowerCase())) return true;
  return /<!--|<!\[CDATA\[|<\?/.test(text);
}

/**
 * Turn angle-bracket placeholders (<username>, <Enter>, <KB number>) outside code into inline code so
 * markdown keeps them as visible text instead of dropping them as unknown HTML. Real tags are left
 * untouched for containsHtml() to reject. Pure.
 */
export function neutralizePlaceholders(markdown: string): string {
  // Skip fenced blocks and inline code spans: split on them and only transform the prose parts.
  const parts = markdown.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // code segment
      return part.replace(ANGLE_RE, (whole, slash: string, name: string) => (HTML_TAGS.has(name.toLowerCase()) || slash ? whole : `\`${whole}\``));
    })
    .join("");
}
