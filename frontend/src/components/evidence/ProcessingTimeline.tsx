import type { AnalysisStatus, ProcessingStage } from "../../types/analysis";

const STAGES: { key: ProcessingStage; label: string }[] = [
  { key: "UPLOAD", label: "Upload" },
  { key: "PREPROCESSING", label: "Preprocessing" },
  { key: "CATNET", label: "CAT-Net Localization" },
  { key: "NARRATIVE", label: "Narrative Interpretation" },
  { key: "REPORT", label: "Report" },
];

interface ProcessingTimelineProps {
  status: AnalysisStatus;
  currentStage: ProcessingStage | undefined;
}

export function ProcessingTimeline({ status, currentStage }: ProcessingTimelineProps) {
  const currentIndex = currentStage
    ? STAGES.findIndex((s) => s.key === currentStage)
    : -1;

  return (
    <ol className="flex flex-col gap-3">
      {STAGES.map((stage, i) => {
        const isDone = status === "COMPLETED" || i < currentIndex;
        const isActive = !isDone && i === currentIndex;
        const isFailedHere = status === "FAILED" && isActive;

        return (
          <li key={stage.key} className="flex items-center gap-3 font-mono text-sm">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                isDone
                  ? "border-accent bg-accent text-canvas"
                  : isFailedHere
                    ? "border-evidence text-evidence"
                    : isActive
                      ? "animate-pulse border-accent text-accent"
                      : "border-border-strong text-ink-faint"
              }`}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span
              className={
                isFailedHere ? "text-evidence" : isDone || isActive ? "text-ink" : "text-ink-faint"
              }
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
