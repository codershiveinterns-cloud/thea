import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonIntent = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed";
const intents: Record<ButtonIntent, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  ghost: "text-zinc-700 hover:bg-zinc-100",
};
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonClass(intent: ButtonIntent = "primary", size: ButtonSize = "md", extra = "") {
  return `${base} ${intents[intent]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: ButtonIntent;
  size?: ButtonSize;
  children: ReactNode;
};

export function Button({ intent = "primary", size = "md", className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(intent, size, className)} {...rest} />;
}

export function LinkButton({
  href,
  intent = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  intent?: ButtonIntent;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(intent, size, className)}>
      {children}
    </Link>
  );
}
