/** Structured run log. Every step appends here; the final report is saved to Setting PIPELINE_LAST_RUN. */
export type LogLevel = "info" | "warn" | "error";
export type LogEntry = { at: string; level: LogLevel; step: string; message: string };

export class RunLog {
  entries: LogEntry[] = [];
  constructor(private readonly echo = true) {}
  private add(level: LogLevel, step: string, message: string) {
    const entry = { at: new Date().toISOString(), level, step, message };
    this.entries.push(entry);
    if (this.echo) {
      const line = `[${step}] ${message}`;
      if (level === "error") console.error(line);
      else if (level === "warn") console.warn(line);
      else console.log(line);
    }
  }
  info(step: string, message: string) { this.add("info", step, message); }
  warn(step: string, message: string) { this.add("warn", step, message); }
  error(step: string, message: string) { this.add("error", step, message); }
}

export type PostOutcome = {
  keywordId: string | null;
  phrase: string;
  categorySlug: string;
  status: "PUBLISHED" | "REVIEW" | "DRY_RUN" | "FAILED";
  postId: string | null;
  title: string | null;
  qualityScore: number | null;
  flaggedIdentifiers: string[];
  /** "gemini/gemini-3.6-flash", "groq/llama-3.3-70b-versatile", … */
  provider?: string;
  error: string | null;
};

export type PipelineReport = {
  ok: boolean;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  ingest: { feeds: { url: string; items: number; error?: string }[]; newKeywords: number };
  posts: PostOutcome[];
  usage: { inputTokens: number; outputTokens: number };
  log: LogEntry[];
};
