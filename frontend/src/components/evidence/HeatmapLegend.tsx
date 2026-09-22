/**
 * Colour key for the CAT-Net heatmap.
 *
 * The gradient reproduces matplotlib's `jet` (the colormap CAT-Net renders
 * with) from its standard anchor stops, so the bar matches the image being
 * explained. The wording is deliberately limited to what the application
 * already documents about this visualization — see the heatmap description in
 * narrative-service/server.mjs — and to the fact that the scale is an
 * intensity ramp. It does not describe the value as a probability, a
 * confidence, or a likelihood of forgery, because CAT-Net reports no such
 * thing.
 */
interface HeatmapLegendProps {
  /** The measured evidence threshold, when it is known. Rendered as a tick so
   *  the picture and the "flagged area" measurement refer to the same cut-off.
   *  Never invented — it comes from EvidenceMetrics.evidenceThreshold. */
  evidenceThreshold?: number;
}

const JET_GRADIENT =
  "linear-gradient(to right, #00007f 0%, #0000ff 12.5%, #00ffff 37.5%, " +
  "#ffff00 62.5%, #ff0000 87.5%, #7f0000 100%)";

export function HeatmapLegend({ evidenceThreshold }: HeatmapLegendProps) {
  const hasThreshold =
    typeof evidenceThreshold === "number" &&
    evidenceThreshold > 0 &&
    evidenceThreshold < 1;

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
          Heatmap intensity
        </span>

        <div className="relative min-w-[180px] flex-1">
          <div
            className="h-2.5 w-full rounded-sm border border-border"
            style={{ background: JET_GRADIENT }}
          />
          {hasThreshold && (
            <span
              className="absolute -top-1 h-4.5 w-px bg-ink"
              style={{ left: `${evidenceThreshold * 100}%` }}
              aria-hidden="true"
            />
          )}
          <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-faint">
            <span>0.0 — cool / blue</span>
            <span>1.0 — warm / red</span>
          </div>
        </div>
      </div>

      <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-ink-faint">
        Warm regions are where CAT-Net found the local JPEG compression history
        inconsistent with the rest of the image; cool regions are where it found
        no such inconsistency.
        {hasThreshold && (
          <>
            {" "}
            The tick marks the {evidenceThreshold!.toFixed(2)} threshold used to
            measure flagged area.
          </>
        )}{" "}
        Intensity is a localization signal, not a probability or confidence
        value, and not a judgement about the document.
      </p>
    </div>
  );
}
