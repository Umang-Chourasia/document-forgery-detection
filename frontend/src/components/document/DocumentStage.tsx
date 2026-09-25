import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RegionFocus } from "./RegionFocus";
import { StageControls } from "./StageControls";
import type { AnalysisPage, RegionBounds } from "../../types/analysis";

export type ViewMode = "original" | "heatmap" | "overlay" | "split";

interface DocumentStageProps {
  page: AnalysisPage;
  /** Bounds of the dominant strong region, when the analysis recorded them. */
  significantRegion?: RegionBounds | null;
}

const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
const SPLIT_GAP = 12;
/** Must match the stage's padding. clientWidth/clientHeight include padding,
 *  so it has to come off the available space or 1x overflows by the padding. */
const STAGE_PADDING = 24;
/** Below this width the stage has no definite height, so it derives one. */
const DESKTOP_MIN_WIDTH = 1024;

interface Size {
  width: number;
  height: number;
}

/**
 * The document canvas: a bright plate on a deeper surround, with the controls
 * floating inside it.
 *
 * The sizing, zoom and pan mathematics are carried over unchanged from the
 * previous viewer and are the part of this file worth protecting:
 *
 *   - Zoom changes the stage's REAL layout dimensions, never
 *     `transform: scale()`. A transform does not affect layout, so the scroll
 *     container would never gain scroll extent and a zoomed document would
 *     simply clip.
 *   - Panning is therefore plain scrollLeft/scrollTop arithmetic.
 *   - Both images use `object-contain` against their own intrinsic
 *     dimensions, so a heatmap whose aspect differs from the source
 *     letterboxes rather than stretching the evidence.
 *
 * The one addition is how the height is chosen. In the workspace the stage
 * has a definite height from its column and simply fills it; below `lg` there
 * is no such height, so it is derived from the document's aspect — otherwise
 * a wide document leaves a tall band of dead canvas on a phone.
 */
export function DocumentStage({ page, significantRegion }: DocumentStageProps) {
  const [mode, setMode] = useState<ViewMode>("overlay");
  const [zoomIndex, setZoomIndex] = useState(0);
  const [opacity, setOpacity] = useState(0.65);
  const [showRegion, setShowRegion] = useState(true);
  const [originalSize, setOriginalSize] = useState<Size | null>(null);
  const [heatmapSize, setHeatmapSize] = useState<Size | null>(null);
  const [heatmapFailed, setHeatmapFailed] = useState(false);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [windowSize, setWindowSize] = useState<Size>(() => ({
    width: typeof window === "undefined" ? 1440 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const [isDragging, setIsDragging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const zoom = ZOOM_STEPS[zoomIndex];
  const hasHeatmap = Boolean(page.catnet.heatmapUrl) && !heatmapFailed;
  const isSplit = mode === "split";
  const isDesktop = windowSize.width >= DESKTOP_MIN_WIDTH;

  // Track the scroll container's size so the fit-to-view scale stays correct
  // across window resizes and layout changes.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => setViewport({ width: el.clientWidth, height: el.clientHeight });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    const onResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
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
   * Desktop: the column gives the stage a definite height, so measure it.
   * Elsewhere: derive it from the measured WIDTH and the document's aspect,
   * which has no circular dependency with the height being set.
   */
  const derivedHeight = Math.round(
    Math.min(
      Math.max(280, availableWidth / aspect + STAGE_PADDING * 2),
      Math.max(320, windowSize.height * 0.62),
    ),
  );
  const availableHeight = Math.max(
    120,
    (isDesktop ? viewport.height : derivedHeight) - STAGE_PADDING * 2,
  );

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
      // Let the controls keep their own pointer behaviour.
      if ((e.target as HTMLElement).closest("input,button")) return;

      dragState.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
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
      alt={`Page ${page.pageNumber} analysis heatmap`}
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

  // The marker is drawn against the heatmap's painted rect. Where the two
  // aspects disagree beyond the tolerance the overlay is already only
  // approximate, so the marker is withheld rather than placed misleadingly.
  const canMark =
    showRegion && !isSplit && !!significantRegion && !!heatmapAspect && !aspectMismatch;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <StageControls
          mode={mode}
          setMode={setMode}
          modesEnabled={hasHeatmap}
          zoom={zoom}
          canZoomIn={zoomIndex < ZOOM_STEPS.length - 1}
          canZoomOut={zoomIndex > 0}
          onZoomIn={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          onZoomOut={() => setZoomIndex((i) => Math.max(0, i - 1))}
          onReset={reset}
          opacity={opacity}
          setOpacity={setOpacity}
          hasRegion={Boolean(significantRegion) && !aspectMismatch}
          showRegion={showRegion}
          setShowRegion={setShowRegion}
        />

        <div
          ref={scrollRef}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`flex items-center justify-center overflow-auto bg-canvas-deep p-6 lg:h-full ${
            canPan ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
          }`}
          style={{
            ...(isDesktop ? {} : { height: `${derivedHeight}px` }),
            touchAction: canPan ? "none" : "auto",
          }}
        >
          {isSplit ? (
            <div className="flex shrink-0 items-center" style={{ gap: `${SPLIT_GAP}px` }}>
              <figure className="shrink-0 bg-white/95" style={paneStyle}>
                {originalImg}
              </figure>
              <figure className="shrink-0 bg-white/95" style={paneStyle}>
                {heatmapImg}
              </figure>
            </div>
          ) : (
            <div className="relative shrink-0 bg-white/95" style={paneStyle}>
              {originalImg}
              {mode !== "original" && heatmapImg && (
                <div
                  className="absolute inset-0"
                  style={{ opacity: mode === "overlay" ? opacity : 1 }}
                >
                  {heatmapImg}
                </div>
              )}
              {canMark && (
                <RegionFocus
                  bounds={significantRegion!}
                  paneWidth={paneWidth}
                  paneHeight={paneHeight}
                  heatmapAspect={heatmapAspect!}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-3">
        <p className="label text-ink-faint">Page {page.pageNumber}</p>
        <div className="label flex flex-wrap gap-x-5 gap-y-1 text-ink-faint">
          {canPan && <span>Drag to pan</span>}
          {aspectMismatch && (
            <span className="text-caution">
              Heatmap aspect differs — letterboxed, not stretched
            </span>
          )}
          {heatmapFailed && (
            <span className="text-caution">Heatmap could not be loaded</span>
          )}
        </div>
      </div>
    </div>
  );
}
