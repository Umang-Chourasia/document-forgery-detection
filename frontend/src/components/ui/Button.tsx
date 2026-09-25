import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Three real button treatments, kept behind the four variant names the rest
 * of the app already passes so no call site has to change:
 *
 *   primary   — one solid accent action per view
 *   secondary — quiet: text with a hairline underline on hover
 *   ghost     — quiet without the rule
 *   danger    — destructive, text-only until it is the confirm step
 *
 * Nothing is a filled pill. Radius is a hint, not a shape.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm font-mono uppercase " +
  "tracking-[0.1em] transition-colors disabled:cursor-not-allowed disabled:opacity-35";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-canvas-deep font-medium enabled:hover:bg-accent/85",
  secondary:
    "border-b border-hairline text-ink-muted enabled:hover:border-accent " +
    "enabled:hover:text-ink",
  ghost: "text-ink-muted enabled:hover:text-ink",
  danger: "text-evidence enabled:hover:text-evidence/80",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-0 py-1 text-[0.6875rem]",
  md: "px-4 py-2.5 text-[0.6875rem]",
  lg: "px-6 py-3.5 text-xs",
};

/** Quiet variants are text, so horizontal padding would only misalign them. */
const FLUSH: ButtonVariant[] = ["secondary", "ghost", "danger"];

function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
) {
  const sizing = FLUSH.includes(variant)
    ? SIZES[size].replace(/px-\d+(\.\d+)?/, "px-0")
    : SIZES[size];
  return `${BASE} ${VARIANTS[variant]} ${sizing} ${extra}`.trim();
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/** Same treatment, for router links that act as buttons. */
export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
