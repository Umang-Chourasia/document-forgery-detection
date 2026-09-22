import type { RiskLevel } from "../../types/analysis";

/**
 * Tampering Risk indicator.
 *
 * Deliberately a solid, flat badge rather than anything gradient-like, so it
 * reads as a discrete classification and is not mistaken for a sample of the
 * heatmap's continuous blue-to-red intensity scale. The heatmap's colours
 * describe per-pixel measurements; this describes a single rule-based level.
 */
const STYLES: Record<RiskLevel, string> = {
  LOW: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  HIGH: "border-red-500/40 bg-red-500/10 text-red-400",
};

const SIZES: Record<"sm" | "md" | "lg", string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
  lg: "px-4 py-2 text-base tracking-[0.15em]",
};

export function RiskBadge({
  level,
  size = "md",
}: {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm border font-mono font-medium uppercase tracking-wide ${SIZES[size]} ${STYLES[level]}`}
    >
      {level}
    </span>
  );
}
