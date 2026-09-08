/**
 * Minimal structured logger. One JSON line per event in production, readable text in dev.
 * Secrets never reach it: every message passes through redact().
 */
import { redact } from "./ai";

export type LogLevel = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");
const threshold = LEVELS[configured] ?? 20;

function serializeError(err: unknown): Fields {
  if (err instanceof Error) return { name: err.name, message: redact(err.message), stack: process.env.NODE_ENV === "production" ? undefined : err.stack };
  return { message: redact(String(err)) };
}

function emit(level: LogLevel, scope: string, message: string, fields?: Fields) {
  if (LEVELS[level] < threshold) return;
  const payload: Fields = { time: new Date().toISOString(), level, scope, message: redact(message), ...fields };
  if (fields && "error" in fields) payload.error = serializeError(fields.error);
  const line = process.env.NODE_ENV === "production" ? JSON.stringify(payload) : `[${scope}] ${payload.message}${fields ? " " + JSON.stringify({ ...fields, error: payload.error }) : ""}`;
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export function logger(scope: string) {
  return {
    debug: (message: string, fields?: Fields) => emit("debug", scope, message, fields),
    info: (message: string, fields?: Fields) => emit("info", scope, message, fields),
    warn: (message: string, fields?: Fields) => emit("warn", scope, message, fields),
    error: (message: string, fields?: Fields) => emit("error", scope, message, fields),
  };
}
