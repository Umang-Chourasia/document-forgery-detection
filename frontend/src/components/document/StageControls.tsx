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
 * Below `lg` the stage is too short for a vertical stack, so the same
 * clusters lie in a row above the document instead of over it.
 *
 * Deliberately no rotate: rotating one layer would break the original/heatmap
 * alignment the viewer guarantees.
 */
export function StageControls({
  mode, setMode, modesEnabled,
  zoom, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onReset,
  opacity, setOpacity,
}: StageControlsProps) {
  return (
    <div className="pointer-events-none z-10 flex flex-wrap items-center justify-end gap-2 px-4 pt-4 lg:absolute lg:right-4 lg:top-4 lg:flex-col lg:flex-nowrap lg:items-end lg:gap-2.5 lg:p-0">
      <Cluster>
        <IconButton label="Zoom in" onClick={onZoomIn} disabled={!canZoomIn}>
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
        </IconButton>
        <span className="px-2 py-1 text-center font-mono text-small tabular-nums text-ink-muted lg:px-0" aria-live="polite">
          {zoom}×
        </span>
        <IconButton label="Zoom out" onClick={onZoomOut} disabled={!canZoomOut}>
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
        </IconButton>
        <IconButton label="Reset view" onClick={onReset}>
          {/* A circular arrow around a fitted frame: returns the document to
              its default fit. Deliberately not the corner brackets, which read
              as fullscreen — there is no fullscreen here. */}
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <rect x="5.5" y="5.5" width="5" height="5" stroke="currentColor" strokeWidth="1.1" />
            <path
              d="M13.2 6.6A5.5 5.5 0 0 0 3.4 4.6M2.8 9.4a5.5 5.5 0 0 0 9.8 2"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
            />
            <path
              d="M3.5 1.9v2.8h2.8M12.5 14.1v-2.8H9.7"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
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
            className={`h-10 w-11 rounded-xl font-mono text-[0.8125rem] transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
              mode === m.key
                ? "bg-ink font-medium text-canvas"
                : "text-ink-muted enabled:hover:bg-surface-raised enabled:hover:text-ink"
            }`}
          >
            {m.short}
          </button>
        ))}
      </Cluster>

      {mode === "overlay" && modesEnabled && (
        <Cluster className="items-center px-3 py-2 lg:px-2 lg:py-3.5">
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
            className="h-1 w-24 cursor-pointer accent-[var(--color-ink)] lg:h-24 lg:w-1 lg:[direction:rtl] lg:[writing-mode:vertical-lr]"
          />
          <span className="ml-2 font-mono text-[0.8125rem] tabular-nums text-ink-muted lg:ml-0 lg:mt-2">
            {Math.round(opacity * 100)}
          </span>
        </Cluster>
      )}
    </div>
  );
}

function Cluster({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto flex flex-row items-center gap-0.5 rounded-[1.375rem] border border-border bg-canvas/80 p-1.5 backdrop-blur lg:flex-col lg:items-stretch ${className}`}
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
      className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-muted transition-colors enabled:hover:bg-surface-raised enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
    >
      {children}
    </button>
  );
}
