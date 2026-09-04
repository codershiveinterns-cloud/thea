import type { ReactNode } from "react";

export function Card({ children, className = "", title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={`rounded-lg border border-zinc-200 bg-white shadow-xs ${className}`}>
      {title || actions ? (
        <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Inline notice for form results. */
export function Notice({ kind = "info", children }: { kind?: "info" | "success" | "error" | "warning"; children: ReactNode }) {
  const tone = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
      {children}
    </div>
  );
}
