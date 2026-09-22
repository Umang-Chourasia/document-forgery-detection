import type { ReactNode } from "react";

/**
 * Panel accents. `tone` is purely presentational, but the three evidence
 * tones are load-bearing for comprehension: the result page uses `accent` for
 * deterministic measurement and `interpretation` for the language model's
 * reading, so the two can never be mistaken for one another at a glance.
 */
export type CardTone = "default" | "accent" | "interpretation" | "caution" | "evidence";

const TONES: Record<CardTone, string> = {
  default: "border-border bg-surface",
  accent: "border-border bg-surface border-l-2 border-l-accent/60",
  interpretation:
    "border-interpretation/25 bg-interpretation-soft border-l-2 border-l-interpretation/70",
  caution: "border-caution/30 bg-surface border-l-2 border-l-caution/60",
  evidence: "border-evidence/30 bg-evidence-soft",
};

interface CardProps {
  tone?: CardTone;
  className?: string;
  children: ReactNode;
}

export function Card({ tone = "default", className = "", children }: CardProps) {
  return (
    <div className={`rounded-sm border ${TONES[tone]} ${className}`}>{children}</div>
  );
}

interface CardHeaderProps {
  title: string;
  /** Small print under the title — used to state measurement vs interpretation. */
  caption?: ReactNode;
  /** Colour for the title, matching the card tone where it carries meaning. */
  titleClass?: string;
  right?: ReactNode;
}

export function CardHeader({
  title,
  caption,
  titleClass = "text-ink-faint",
  right,
}: CardHeaderProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`font-mono text-xs uppercase tracking-wide ${titleClass}`}>
          {title}
        </h2>
        {right}
      </div>
      {caption && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{caption}</p>
      )}
    </div>
  );
}
