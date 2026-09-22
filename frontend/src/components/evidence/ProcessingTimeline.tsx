import { useEffect, useState } from "react";
import type { AnalysisStatus, ProcessingStage } from "../../types/analysis";

/**
 * Stage captions describe what the pipeline is actually doing at each step.
 * There is deliberately no percentage bar: the pipeline reports discrete
 * stages, not progress, and inventing a percentage would be inventing data.
 * The elapsed counter is real, measured in the browser.
 */
const STAGES: { key: ProcessingStage; label: string; caption: string }[] = [
  { key: "UPLOAD", label: "Upload", caption: "Storing the original document." },
  {
    key: "PREPROCESSING",
    label: "Preprocessing",
    caption: "Preparing the image for the model.",
  },
  {
    key: "CATNET",
    label: "CAT-Net Localization",
    caption: "Tracing compression artifacts across the page.",
  },
  {
    key: "NARRATIVE",
    label: "Narrative Interpretation",
    caption: "Measuring the heatmap, then interpreting the evidence.",
  },
  { key: "REPORT", label: "Report", caption: "Assembling the result." },
];

interface ProcessingTimelineProps {
  status: AnalysisStatus;
  currentStage: ProcessingStage | undefined;
  /** ISO timestamp the analysis was created, for the elapsed counter. */
  startedAt?: string;
}

function useElapsedSeconds(startedAt?: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return null;
  return Math.max(0, Math.floor((now - started) / 1000));
}

export function ProcessingTimeline({
  status,
  currentStage,
  startedAt,
}: ProcessingTimelineProps) {
  const elapsed = useElapsedSeconds(startedAt);
  const currentIndex = currentStage
    ? STAGES.findIndex((s) => s.key === currentStage)
    : -1;
  const active = currentIndex >= 0 ? STAGES[currentIndex] : undefined;

  return (
    <div className="flex flex-col items-center py-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="relative mb-4 flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20 motion-reduce:animate-none" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent-soft font-mono text-sm text-accent">
            {currentIndex >= 0 ? currentIndex + 1 : "·"}
          </span>
        </span>
        <p className="font-mono text-sm text-ink">
          {active ? active.label : "Starting analysis"}
        </p>
        <p className="mt-1 max-w-xs text-sm text-ink-muted">
          {active ? active.caption : "Queued for processing."}
        </p>
        {elapsed !== null && (
          <p className="mt-3 font-mono text-xs tabular-nums text-ink-faint">
            {elapsed}s elapsed
          </p>
        )}
      </div>

      <ol className="flex w-full max-w-sm flex-col gap-3">
        {STAGES.map((stage, i) => {
          const isDone = status === "COMPLETED" || i < currentIndex;
          const isActive = !isDone && i === currentIndex;
          const isFailedHere = status === "FAILED" && isActive;

          return (
            <li
              key={stage.key}
              className="flex items-center gap-3 font-mono text-sm"
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  isDone
                    ? "border-accent bg-accent text-canvas"
                    : isFailedHere
                      ? "border-evidence text-evidence"
                      : isActive
                        ? "animate-pulse border-accent text-accent motion-reduce:animate-none"
                        : "border-border-strong text-ink-faint"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <span
                className={
                  isFailedHere
                    ? "text-evidence"
                    : isDone || isActive
                      ? "text-ink"
                      : "text-ink-faint"
                }
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
