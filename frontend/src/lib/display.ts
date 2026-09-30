import type { RiskLevel } from "../types/analysis";

/** "COMPLETED" → "Completed". Display only; the enum value is unchanged. */
export function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/**
 * Risk-level colours. Written out in full because Tailwind only generates
 * classes it can read literally in source.
 */
export const RISK_TEXT: Record<RiskLevel, string> = {
  LOW: "text-safe",
  MEDIUM: "text-caution",
  HIGH: "text-evidence",
};

export const RISK_FILL: Record<RiskLevel, string> = {
  LOW: "bg-safe",
  MEDIUM: "bg-caution",
  HIGH: "bg-evidence",
};

/**
 * Heatmap opacity in the viewer's Overlay mode by default. The report's
 * overlay image is composited at the same value, so the two look alike.
 */
export const DEFAULT_OVERLAY_OPACITY = 0.65;
