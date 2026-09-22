import { Card, CardHeader } from "../ui/Card";
import type { EvidenceMetrics, TamperingRisk } from "../../types/analysis";

/**
 * The deterministic layer.
 *
 * Every value rendered here is read straight out of EvidenceMetrics. Nothing
 * is derived, combined, rescaled or re-thresholded — the only arithmetic is
 * fraction-to-percent for display, and the histogram bars are drawn relative
 * to the largest bin purely so short bars remain visible.
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
        caption="Derived from the rendered heatmap. Measurements, not model output."
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

      <IntensityHistogram metrics={metrics} />

      <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-faint">
        Heatmap {metrics.heatmapWidth}×{metrics.heatmapHeight} ·{" "}
        {metrics.evidencePixelCount.toLocaleString()} px at or above{" "}
        {metrics.evidenceThreshold}
      </p>
    </Card>
  );
}

/**
 * The 10-band intensity histogram that the metrics payload has always
 * carried but the UI never showed.
 *
 * Bar heights are log-scaled. Real CAT-Net output is strongly bimodal — the
 * lowest band routinely holds tens of thousands of times more pixels than
 * any other — so a linear axis renders every band except the first as a flat
 * line and hides exactly the evidence this panel exists to show. The axis is
 * labelled as log scale, and the tooltips report the raw counts unchanged.
 */
function IntensityHistogram({ metrics }: { metrics: EvidenceMetrics }) {
  const bins = metrics.intensityHistogram;
  if (!bins?.length) return null;

  const scale = (n: number) => Math.log10(n + 1);
  const peak = scale(Math.max(...bins));
  if (peak <= 0) return null;

  // Which bands sit at or above the evidence threshold, for the marker line.
  const thresholdBand = Math.round(metrics.evidenceThreshold * bins.length);

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
        Intensity distribution · {bins.length} bands · log scale
      </p>
      <div className="relative flex h-16 items-end gap-px">
        {bins.map((count, i) => {
          const atOrAboveThreshold = i >= thresholdBand;
          return (
            <div
              key={i}
              title={`${(i / bins.length).toFixed(1)}–${((i + 1) / bins.length).toFixed(1)}: ${count.toLocaleString()} px`}
              style={{ height: `${Math.max(1, (scale(count) / peak) * 100)}%` }}
              className={`flex-1 rounded-t-[1px] ${
                atOrAboveThreshold ? "bg-accent/70" : "bg-border-strong"
              }`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-faint">
        <span>0.0</span>
        <span>1.0</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
        Pixel counts per intensity band, log-scaled so the smaller bands stay
        visible. Highlighted bands are at or above the {metrics.evidenceThreshold}{" "}
        threshold and make up the flagged area.
      </p>
    </div>
  );
}
