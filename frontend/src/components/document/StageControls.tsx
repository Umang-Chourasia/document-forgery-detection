import type { ViewMode } from "./DocumentStage";

interface StageControlsProps {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  modesEnabled: boolean;
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  opacity: number;
  setOpacity: (v: number) => void;
  hasRegion: boolean;
  showRegion: boolean;
  setShowRegion: (v: boolean) => void;
}

const MODES: { key: ViewMode; short: string; label: string }[] = [
  { key: "original", short: "OR", label: "Original" },
  { key: "heatmap", short: "HM", label: "Heatmap" },
  { key: "overlay", short: "OV", label: "Overlay" },
  { key: "split", short: "SB", label: "Side by side" },
];

/**
 * A floating cluster pinned inside the document canvas rather than a control
 * bar above it, so the document keeps the whole stage. It carries its own
 * scrim because it sits over a bright plate.
 *
 * Deliberately no rotate: rotating one layer would break the original/heatmap
 * alignment the viewer guarantees.
 */
export function StageControls({
  mode, setMode, modesEnabled,
  zoom, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onReset,
  opacity, setOpacity, hasRegion, showRegion, setShowRegion,
}: StageControlsProps) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
      <Cluster>
        <IconButton label="Zoom in" onClick={onZoomIn} disabled={!canZoomIn}>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
        </IconButton>
        <span className="label px-1 py-1 text-center tabular-nums text-ink-muted" aria-live="polite">
          {zoom}×
        </span>
        <IconButton label="Zoom out" onClick={onZoomOut} disabled={!canZoomOut}>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
        </IconButton>
        <IconButton label="Fit to view" onClick={onReset}>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path
              d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10"
              stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </IconButton>
      </Cluster>

      <Cluster>
        {MODES.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={mode === m.key}
            aria-label={m.label}
            title={m.label}
            disabled={m.key !== "original" && !modesEnabled}
            onClick={() => setMode(m.key)}
            className={`label px-1 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
              mode === m.key ? "text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {m.short}
          </button>
        ))}
      </Cluster>

      {mode === "overlay" && modesEnabled && (
        <Cluster className="items-center px-2 py-3">
          <label htmlFor="heatmap-opacity" className="label sr-only">
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
            aria-label="Overlay opacity"
            className="h-24 w-1 cursor-pointer accent-[var(--color-accent)]"
            style={{ writingMode: "vertical-lr", direction: "rtl" }}
          />
          <span className="label mt-2 tabular-nums text-ink-muted">
            {Math.round(opacity * 100)}
          </span>
        </Cluster>
      )}

      {hasRegion && (
        <Cluster>
          <button
            onClick={() => setShowRegion(!showRegion)}
            aria-pressed={showRegion}
            title="Significant region"
            className={`label px-1 py-1.5 transition-colors ${
              showRegion ? "text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            RG
          </button>
        </Cluster>
      )}
    </div>
  );
}

function Cluster({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto flex flex-col items-stretch gap-1 border border-hairline bg-canvas/85 p-1 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function IconButton({
  label, onClick, disabled, children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
    >
      {children}
    </button>
  );
}
