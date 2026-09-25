import type { RegionBounds } from "../../types/analysis";

interface RegionFocusProps {
  /** Normalized to the HEATMAP image, not to the pane. */
  bounds: RegionBounds;
  /** Pane box the images are laid out in, in px. */
  paneWidth: number;
  paneHeight: number;
  /** Intrinsic heatmap aspect, so the contain-rect can be derived. */
  heatmapAspect: number;
}

/**
 * Marks the single most significant strong region — the same region the
 * deterministic rule acted on and the one the interpretation describes.
 * Presentation only: it draws bounds the backend already computed and
 * influences nothing.
 *
 * The bounds are fractions of the heatmap IMAGE, but the pane is sized from
 * the ORIGINAL's aspect and the heatmap sits inside it with `object-contain`.
 * When the two aspects differ the heatmap is letterboxed, so the marker is
 * positioned against the painted rectangle rather than against the pane —
 * assuming they coincide would place it wrong on any mismatched pair.
 */
export function RegionFocus({
  bounds,
  paneWidth,
  paneHeight,
  heatmapAspect,
}: RegionFocusProps) {
  if (!paneWidth || !paneHeight || !heatmapAspect) return null;

  const paneAspect = paneWidth / paneHeight;

  // The contain-rect: the area the heatmap actually paints inside the pane.
  const painted =
    heatmapAspect > paneAspect
      ? { w: paneWidth, h: paneWidth / heatmapAspect }
      : { w: paneHeight * heatmapAspect, h: paneHeight };
  const offsetX = (paneWidth - painted.w) / 2;
  const offsetY = (paneHeight - painted.h) / 2;

  const left = offsetX + bounds.x * painted.w;
  const top = offsetY + bounds.y * painted.h;
  const width = bounds.width * painted.w;
  const height = bounds.height * painted.h;

  // Very small regions get a minimum footprint so the marker stays findable
  // at 1x; the label sits outside so it never covers the evidence.
  const w = Math.max(width, 8);
  const h = Math.max(height, 8);

  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 border border-accent" />
      {/* Corner ticks, so the marker reads as a registration bracket rather
          than a filled highlight obscuring what is underneath. */}
      {[
        "-left-px -top-px border-l-2 border-t-2",
        "-right-px -top-px border-r-2 border-t-2",
        "-bottom-px -left-px border-b-2 border-l-2",
        "-bottom-px -right-px border-b-2 border-r-2",
      ].map((pos) => (
        <span key={pos} className={`absolute h-2 w-2 border-accent ${pos}`} />
      ))}
      <span className="label absolute -top-4 left-0 whitespace-nowrap text-accent">
        Region
      </span>
    </div>
  );
}
