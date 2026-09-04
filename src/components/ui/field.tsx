import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const control =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-zinc-50";

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 flex items-baseline justify-between text-sm font-medium text-zinc-800">
      <span>{children}</span>
      {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-24 ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} ${className}`} {...rest} />;
}

/** Label + control + optional error/help text. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  help,
  children,
  className = "",
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : help ? (
        <p className="mt-1 text-xs text-zinc-500">{help}</p>
      ) : null}
    </div>
  );
}
