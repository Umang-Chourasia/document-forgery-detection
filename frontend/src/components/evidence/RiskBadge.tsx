import { titleCase } from "../../lib/display";
import type { RiskLevel } from "../../types/analysis";

/**
 * Tampering Risk indicator.
 *
 * Deliberately a solid, flat pill rather than anything gradient-like, so it
 * reads as a discrete classification and is not mistaken for a sample of the
 * heatmap's continuous blue-to-red intensity scale. The heatmap's colours
 * describe per-pixel measurements; this describes a single rule-based level.
 */
const STYLES: Record<RiskLevel, string> = {
  LOW: "bg-safe-soft text-safe",
  MEDIUM: "bg-caution-soft text-caution",
  HIGH: "bg-evidence-soft text-evidence",
};

const SIZES: Record<"sm" | "md" | "lg", string> = {
  sm: "px-2.5 py-0.5 text-[0.8125rem]",
  md: "px-3 py-1 text-small",
  lg: "px-4 py-1.5 text-body",
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
      className={`inline-flex shrink-0 items-center rounded-full font-medium ${SIZES[size]} ${STYLES[level]}`}
    >
      {titleCase(level)}
    </span>
  );
}
