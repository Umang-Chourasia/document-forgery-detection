import { Badge, type BadgeSize } from "../ui/Badge";
import { titleCase } from "../../lib/display";
import type { AnalysisStatus } from "../../types/analysis";

/**
 * Single definition of the pipeline-status palette. It previously existed
 * twice — once in AnalysisResult and once in History — which is exactly the
 * kind of duplication that drifts.
 */
const STATUS_STYLES: Record<AnalysisStatus, string> = {
  QUEUED: "bg-surface-raised text-ink-muted",
  PROCESSING: "bg-accent-soft text-accent",
  COMPLETED: "bg-accent-soft text-accent",
  FAILED: "bg-evidence-soft text-evidence",
};

interface StatusBadgeProps {
  status: AnalysisStatus;
  size?: BadgeSize;
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  return (
    <Badge size={size} className={STATUS_STYLES[status]}>
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${
          status === "PROCESSING" ? "animate-pulse motion-reduce:animate-none" : ""
        }`}
      />
      {titleCase(status)}
    </Badge>
  );
}
