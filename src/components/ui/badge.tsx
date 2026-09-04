import type { KeywordStatus, PostStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/post-status";

const postTone: Record<PostStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  REVIEW: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-sky-50 text-sky-800 ring-sky-200",
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ARCHIVED: "bg-zinc-100 text-zinc-500 ring-zinc-200 line-through",
};

const keywordTone: Record<KeywordStatus, string> = {
  QUEUED: "bg-blue-50 text-blue-800 ring-blue-200",
  USED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  SKIPPED: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export function Badge({ children, tone = "bg-zinc-100 text-zinc-700 ring-zinc-200", className = "" }: { children: React.ReactNode; tone?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone} ${className}`}>
      {children}
    </span>
  );
}

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return <Badge tone={postTone[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function KeywordStatusBadge({ status }: { status: KeywordStatus }) {
  return <Badge tone={keywordTone[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
