import { Badge, type BadgeSize } from "../ui/Badge";
import type { AnalysisStatus } from "../../types/analysis";

/**
 * Single definition of the pipeline-status palette. It previously existed
 * twice — once in AnalysisResult and once in History — which is exactly the
 * kind of duplication that drifts.
 */
const STATUS_STYLES: Record<AnalysisStatus, string> = {
  QUEUED: "border-ink-faint/40 text-ink-muted",
  PROCESSING: "border-accent/40 text-accent",
  COMPLETED: "border-accent/40 bg-accent-soft text-accent",
  FAILED: "border-evidence/40 bg-evidence-soft text-evidence",
};

interface StatusBadgeProps {
  status: AnalysisStatus;
  size?: BadgeSize;
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  return (
    <Badge size={size} className={STATUS_STYLES[status]}>
      {status === "PROCESSING" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
      )}
      {status}
    </Badge>
  );
}
