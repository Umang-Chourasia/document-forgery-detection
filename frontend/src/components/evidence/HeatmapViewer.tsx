import { useState } from "react";
import type { AnalysisPage } from "../../types/analysis";

type ViewMode = "original" | "heatmap" | "overlay";

interface HeatmapViewerProps {
  page: AnalysisPage;
}

const ZOOM_STEPS = [1, 1.5, 2, 3];

export function HeatmapViewer({ page }: HeatmapViewerProps) {
  const [mode, setMode] = useState<ViewMode>("overlay");
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_STEPS[zoomIndex];

  const hasHeatmap = Boolean(page.catnet.heatmapUrl);

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex gap-1 font-mono text-xs">
          {(["original", "heatmap", "overlay"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={m !== "original" && !hasHeatmap}
              className={`rounded-sm px-3 py-1.5 uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                mode === m
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 font-mono text-xs text-ink-muted">
          <button
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={zoomIndex === 0}
            className="rounded-sm px-2 py-1 hover:text-ink disabled:opacity-30"
          >
            −
          </button>
          <span className="w-10 text-center">{zoom}×</span>
          <button
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            className="rounded-sm px-2 py-1 hover:text-ink disabled:opacity-30"
          >
            +
          </button>
          <button
            onClick={() => setZoomIndex(0)}
            className="ml-1 rounded-sm px-2 py-1 hover:text-ink"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-canvas p-6">
        <div
          className="relative shrink-0 transition-transform"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={page.originalImageUrl}
            alt={`Page ${page.pageNumber} original`}
            className="block max-h-[55vh] max-w-full"
          />
          {mode !== "original" && hasHeatmap && (
            <img
              src={page.catnet.heatmapUrl}
              alt={`Page ${page.pageNumber} CAT-Net heatmap`}
              className="absolute inset-0 h-full w-full"
              style={{ opacity: mode === "overlay" ? 0.65 : 1 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
