import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HeatmapLegend } from "./HeatmapLegend";
import type { AnalysisPage } from "../../types/analysis";

type ViewMode = "original" | "heatmap" | "overlay" | "split";

interface HeatmapViewerProps {
  page: AnalysisPage;
  /** From EvidenceMetrics, when available — passed straight to the legend. */
  evidenceThreshold?: number;
}

const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
const SPLIT_GAP = 12;
/** Must match the stage's `p-3`. clientWidth/clientHeight include padding, so
 *  it has to come off the available space or 1x overflows by the padding. */
const STAGE_PADDING = 12;

const MODE_LABELS: Record<ViewMode, string> = {
  original: "Original",
  heatmap: "Heatmap",
  overlay: "Overlay",
  split: "Side by side",
};

interface Size {
  width: number;
  height: number;
}

/**
 * The evidence viewer.
 *
 * Zoom is implemented by changing the stage's real layout dimensions, NOT by
 * CSS `transform: scale()`. A transform does not affect layout, so the
 * scroll container never gains any scroll extent and a zoomed image simply
 * overflows and clips — which is what the previous implementation did above
 * 1x. Sizing the stage instead means the browser's own scrolling works, and
 * pointer-drag panning is then just scrollLeft/scrollTop arithmetic.
 *
 * Aspect ratio is preserved from each image's own intrinsic dimensions. The
 * heatmap is laid over the original inside the same box with `object-contain`,
 * so if CAT-Net ever returns a heatmap whose aspect ratio differs from the
 * source it letterboxes (and we say so) rather than silently stretching the
 * evidence to fit.
 */
export function HeatmapViewer({ page, evidenceThreshold }: HeatmapViewerProps) {
  const [mode, setMode] = useState<ViewMode>("overlay");
  const [zoomIndex, setZoomIndex] = useState(0);
  const [opacity, setOpacity] = useState(0.65);
  const [originalSize, setOriginalSize] = useState<Size | null>(null);
  const [heatmapSize, setHeatmapSize] = useState<Size | null>(null);
  const [heatmapFailed, setHeatmapFailed] = useState(false);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [windowHeight, setWindowHeight] = useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  const [isDragging, setIsDragging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ x: number; y: number; left: number; top: number } | null>(
    null,
  );

  const zoom = ZOOM_STEPS[zoomIndex];
  const hasHeatmap = Boolean(page.catnet.heatmapUrl) && !heatmapFailed;
  const isSplit = mode === "split";

  // Track the scroll container's size so the fit-to-view scale stays correct
  // across window resizes and layout changes.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () =>
      setViewport({ width: el.clientWidth, height: el.clientHeight });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    const onResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // A mode with a different fit (split halves the available width) would
  // otherwise leave the scroll position somewhere meaningless.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [mode]);

  // Fall back to the original's aspect ratio until the image reports its own.
  const aspect = originalSize ? originalSize.width / originalSize.height : 4 / 3;

  const innerWidth = viewport.width - STAGE_PADDING * 2;

  const availableWidth = Math.max(
    120,
    isSplit ? (innerWidth - SPLIT_GAP) / 2 : innerWidth,
  );

  /**
   * The stage sizes itself to the image's own aspect ratio, capped at 62% of
   * the window. A fixed height instead left a tall band of empty canvas above
   * and below a wide image — very visible on phones, where width is always
   * the binding constraint. Derived from the measured WIDTH only, so there is
   * no circular dependency with the height we are setting.
   */
  const stageHeight = Math.round(
    Math.min(
      Math.max(280, availableWidth / aspect + STAGE_PADDING * 2),
      Math.max(320, windowHeight * 0.62),
    ),
  );

  const availableHeight = Math.max(120, stageHeight - STAGE_PADDING * 2);

  // Fit-to-view at 1x ("contain"), then scale the real box by the zoom level.
  const fitScale = Math.min(availableWidth / aspect, availableHeight);
  const paneHeight = fitScale * zoom;
  const paneWidth = paneHeight * aspect;

  const heatmapAspect = heatmapSize ? heatmapSize.width / heatmapSize.height : null;
  const aspectMismatch =
    heatmapAspect !== null && Math.abs(heatmapAspect - aspect) / aspect > 0.01;

  const canPan = zoom > 1;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el || !canPan) return;
      // Let the opacity slider and buttons keep their own pointer behaviour.
      if ((e.target as HTMLElement).closest("input,button")) return;

      dragState.current = {
        x: e.clientX,
        y: e.clientY,
        left: el.scrollLeft,
        top: el.scrollTop,
      };
      el.setPointerCapture(e.pointerId);
      setIsDragging(true);
    },
    [canPan],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const start = dragState.current;
    if (!el || !start) return;
    el.scrollLeft = start.left - (e.clientX - start.x);
    el.scrollTop = start.top - (e.clientY - start.y);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    dragState.current = null;
    setIsDragging(false);
    scrollRef.current?.releasePointerCapture?.(e.pointerId);
  }, []);

  const reset = () => {
    setZoomIndex(0);
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  };

  const paneStyle = { width: `${paneWidth}px`, height: `${paneHeight}px` };

  const originalImg = (
    <img
      src={page.originalImageUrl}
      alt={`Page ${page.pageNumber} original`}
      draggable={false}
      onLoad={(e) =>
        setOriginalSize({
          width: e.currentTarget.naturalWidth,
          height: e.currentTarget.naturalHeight,
        })
      }
      className="h-full w-full select-none object-contain"
    />
  );

  const heatmapImg = hasHeatmap ? (
    <img
      src={page.catnet.heatmapUrl}
      alt={`Page ${page.pageNumber} CAT-Net heatmap`}
      draggable={false}
      onLoad={(e) =>
        setHeatmapSize({
          width: e.currentTarget.naturalWidth,
          height: e.currentTarget.naturalHeight,
        })
      }
      onError={() => setHeatmapFailed(true)}
      className="h-full w-full select-none object-contain"
    />
  ) : null;

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      {/* ---- Toolbar ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div
          role="tablist"
          aria-label="Evidence view"
          className="flex flex-wrap gap-1 font-mono text-xs"
        >
          {(["original", "heatmap", "overlay", "split"] as ViewMode[]).map((m) => {
            const disabled = m !== "original" && !hasHeatmap;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                disabled={disabled}
                className={`rounded-sm px-3 py-1.5 uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                  mode === m
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 font-mono text-xs text-ink-muted">
          <button
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={zoomIndex === 0}
            aria-label="Zoom out"
            className="rounded-sm px-2 py-1 hover:text-ink disabled:opacity-30"
          >
            −
          </button>
          <span className="w-10 text-center tabular-nums" aria-live="polite">
            {zoom}×
          </span>
          <button
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            aria-label="Zoom in"
            className="rounded-sm px-2 py-1 hover:text-ink disabled:opacity-30"
          >
            +
          </button>
          <button
            onClick={reset}
            className="ml-1 rounded-sm px-2 py-1 hover:text-ink"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ---- Overlay opacity ---- */}
      {mode === "overlay" && hasHeatmap && (
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <label
            htmlFor="heatmap-opacity"
            className="font-mono text-[10px] uppercase tracking-wide text-ink-faint"
          >
            Overlay opacity
          </label>
          <input
            id="heatmap-opacity"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="h-1 max-w-xs flex-1 cursor-pointer accent-[var(--color-accent)]"
          />
          <span className="w-10 text-right font-mono text-[11px] tabular-nums text-ink-muted">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      )}

      {/* ---- Stage ---- */}
      <div
        ref={scrollRef}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`flex items-center justify-center overflow-auto bg-canvas p-3 ${
          canPan ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
        }`}
        style={{ height: `${stageHeight}px`, touchAction: canPan ? "none" : "auto" }}
      >
        {isSplit ? (
          <div className="flex shrink-0 items-center" style={{ gap: `${SPLIT_GAP}px` }}>
            <figure className="shrink-0" style={paneStyle}>
              {originalImg}
            </figure>
            <figure className="shrink-0" style={paneStyle}>
              {heatmapImg}
            </figure>
          </div>
        ) : (
          <div className="relative shrink-0" style={paneStyle}>
            {originalImg}
            {mode !== "original" && heatmapImg && (
              <div
                className="absolute inset-0"
                style={{ opacity: mode === "overlay" ? opacity : 1 }}
              >
                {heatmapImg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- Footnotes ---- */}
      {(canPan || aspectMismatch || heatmapFailed) && (
        <div className="flex flex-col gap-1 border-t border-border px-4 py-2">
          {canPan && (
            <p className="font-mono text-[10px] text-ink-faint">
              Drag to pan · Reset returns to fit
            </p>
          )}
          {aspectMismatch && (
            <p className="font-mono text-[10px] text-caution">
              Heatmap aspect ratio differs from the original — it is letterboxed,
              not stretched, so alignment may be approximate.
            </p>
          )}
          {heatmapFailed && (
            <p className="font-mono text-[10px] text-caution">
              The heatmap image could not be loaded. Only the original is shown.
            </p>
          )}
        </div>
      )}

      {hasHeatmap && <HeatmapLegend evidenceThreshold={evidenceThreshold} />}
    </div>
  );
}
