import { RiskBadge } from "../evidence/RiskBadge";
import { StatusBadge } from "../evidence/StatusBadge";
import type { RiskLevel, AnalysisStatus } from "../../types/analysis";

export interface ActiveDocument {
  id: string;
  documentName: string;
  status: AnalysisStatus;
  riskLevel?: RiskLevel;
}

/**
 * The loaded document's identity, shown in the application chrome so the
 * stage does not have to repeat it. Filename plus the one indicator that
 * matters: the risk level once it exists, the pipeline status until then.
 */
export function DocumentIdentity({ doc }: { doc: ActiveDocument }) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-l border-hairline pl-5">
      <span className="min-w-0 max-w-[16rem] truncate text-small text-ink" title={doc.documentName}>
        {doc.documentName}
      </span>
      {doc.riskLevel ? (
        <RiskBadge level={doc.riskLevel} size="sm" />
      ) : (
        <StatusBadge status={doc.status} size="sm" />
      )}
    </div>
  );
}
