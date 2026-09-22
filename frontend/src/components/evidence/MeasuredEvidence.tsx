import { Card, CardHeader } from "../ui/Card";
import type { EvidenceMetrics, TamperingRisk } from "../../types/analysis";

/**
 * The deterministic layer.
 *
 * Every value rendered here is read straight out of EvidenceMetrics. Nothing
 * is derived, combined, rescaled or re-thresholded — the only arithmetic is
 * fraction-to-percent for display.
 *
 * `intensityHistogram` is intentionally not rendered. It remains in the
 * metrics payload because the deterministic risk rule reads it; it is simply
 * not part of the reviewer-facing presentation.
 */
interface MeasuredEvidenceProps {
  metrics: EvidenceMetrics;
  risk?: TamperingRisk;
}

/** Metric keys as the risk rule names them in `risk.inputs`. */
const RULE_INPUT_KEYS = [
  "evidenceAreaFraction",
  "maxIntensity",
  "largestRegionFraction",
  "largestRegionShare",
  "regionCount",
] as const;

export function MeasuredEvidence({ metrics, risk }: MeasuredEvidenceProps) {
  const usedByRule = new Set(
    RULE_INPUT_KEYS.filter((key) => risk?.inputs?.[key] !== undefined),
  );

  // `evidenceAreaFraction` is deliberately absent: it is already shown, to
  // scale, by the bar above, and repeating it here read as two measurements.
  const rows: { key: string; label: string; value: string }[] = [
    {
      key: "maxIntensity",
      label: "Peak intensity",
      value: metrics.maxIntensity.toFixed(2),
    },
    {
      key: "meanEvidenceIntensity",
      label: "Mean (flagged)",
      value: metrics.meanEvidenceIntensity.toFixed(2),
    },
    {
      key: "regionCount",
      label: "Regions",
      value: String(metrics.regionCount),
    },
    {
      key: "largestRegionFraction",
      label: "Largest region",
      value: `${(metrics.largestRegionFraction * 100).toFixed(2)}% of image`,
    },
    {
      key: "largestRegionShare",
      label: "Concentration",
      value: `${(metrics.largestRegionShare * 100).toFixed(0)}% in largest`,
    },
  ];

  return (
    <Card tone="accent" className="p-5">
      <CardHeader
        title="Measured Evidence"
        titleClass="text-accent"
        caption="Calculated from the detected evidence. Measurements, not interpretation."
      />

      {/* Flagged area, drawn to scale against the whole image. */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between font-mono text-xs">
          <span className="flex items-center gap-1.5 text-ink-faint">
            Flagged area of image
            {usedByRule.has("evidenceAreaFraction") && (
              <span
                title="Used by the risk rule"
                aria-label="Used by the risk rule"
                className="inline-block h-1.5 w-1.5 rounded-full bg-accent/70"
              />
            )}
          </span>
          <span className="tabular-nums text-ink">
            {(metrics.evidenceAreaFraction * 100).toFixed(2)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-sm bg-canvas">
          <div
            className="h-full bg-accent"
            style={{
              width: `${Math.min(100, metrics.evidenceAreaFraction * 100)}%`,
              minWidth: metrics.evidenceAreaFraction > 0 ? "2px" : "0",
            }}
          />
        </div>
      </div>

      <dl className="flex flex-col gap-2 font-mono text-xs">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-ink-faint">
              {row.label}
              {usedByRule.has(row.key as (typeof RULE_INPUT_KEYS)[number]) && (
                <span
                  title="Used by the risk rule"
                  aria-label="Used by the risk rule"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-accent/70"
                />
              )}
            </dt>
            <dd className="tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      {usedByRule.size > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-relaxed text-ink-faint">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
          Read by the risk rule for this result.
        </p>
      )}

      <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-faint">
        Heatmap {metrics.heatmapWidth}×{metrics.heatmapHeight} ·{" "}
        {metrics.evidencePixelCount.toLocaleString()} px at or above{" "}
        {metrics.evidenceThreshold}
      </p>
    </Card>
  );
}
