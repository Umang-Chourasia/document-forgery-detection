import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Pill buttons, behind the four variant names the rest of the app already
 * passes so no call site has to change:
 *
 *   primary   — solid white pill; one per view
 *   secondary — outlined pill
 *   ghost     — text only
 *   danger    — destructive, text-only until it is the confirm step
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "tracking-[-0.01em] transition-colors disabled:cursor-not-allowed disabled:opacity-35";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-canvas enabled:hover:bg-ink/85 [&:not(button)]:hover:bg-ink/85",
  secondary:
    "border border-border text-ink enabled:hover:border-border-strong enabled:hover:bg-surface " +
    "[&:not(button)]:hover:bg-surface",
  ghost: "text-ink-muted enabled:hover:text-ink",
  danger: "text-evidence enabled:hover:text-evidence/80",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-small",
  md: "px-5 py-2.5 text-body",
  lg: "px-7 py-4 text-body",
};

/** Text-only variants would only be misaligned by horizontal padding. */
const FLUSH: ButtonVariant[] = ["ghost", "danger"];

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

/** The arrow used on forward-moving primary actions. */
export function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
