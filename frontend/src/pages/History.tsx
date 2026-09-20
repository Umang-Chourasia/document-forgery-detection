import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteAnalysisFromSupabase,
  listAnalysesFromSupabase,
  type SupabaseHistorySummary,
} from "../api/supabaseHistory";
import { RiskBadge } from "../components/evidence/RiskBadge";
import type { AnalysisStatus } from "../types/analysis";

const STATUS_STYLES: Record<AnalysisStatus, string> = {
  QUEUED: "border-ink-faint/40 text-ink-muted",
  PROCESSING: "border-accent/40 text-accent",
  COMPLETED: "border-accent/40 bg-accent-soft text-accent",
  FAILED: "border-evidence/40 bg-evidence-soft text-evidence",
};

export function History() {
  const [entries, setEntries] = useState<SupabaseHistorySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listAnalysesFromSupabase()
      .then(setEntries)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load your history.");
        setEntries([]);
      });
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteAnalysisFromSupabase(id);
      setEntries((prev) => prev?.filter((entry) => entry.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that analysis.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">History</p>
      <h1 className="mb-4 text-2xl font-medium text-ink">Past Analyses</h1>
      <p className="mb-8 max-w-lg text-sm text-ink-muted">
        Your analyses are stored privately to your account. Documents and results are
        automatically deleted 7 days after analysis.
      </p>

      {error && (
        <p className="mb-6 rounded-sm border border-evidence/30 bg-evidence-soft px-4 py-3 text-sm text-evidence">
          {error}
        </p>
      )}

      {entries === null && <p className="font-mono text-sm text-ink-muted">Loading…</p>}

      {entries?.length === 0 && !error && (
        <div className="rounded-sm border border-border bg-surface p-8 text-center">
          <p className="text-sm text-ink-muted">You haven't analyzed any documents yet.</p>
          <Link to="/analyze" className="mt-4 inline-block font-mono text-xs text-accent">
            Run your first analysis →
          </Link>
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-sm border border-border bg-surface p-4"
            >
              {entry.thumbnailUrl ? (
                <img
                  src={entry.thumbnailUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-sm border border-border object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-border font-mono text-[10px] text-ink-faint">
                  n/a
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{entry.documentName}</p>
                <p className="font-mono text-xs text-ink-faint">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
                {entry.status === "FAILED" && entry.error && (
                  <p className="mt-0.5 truncate font-mono text-xs text-evidence">{entry.error}</p>
                )}
              </div>

              {entry.riskLevel && (
                <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                    Risk
                  </span>
                  <RiskBadge level={entry.riskLevel} size="sm" />
                </span>
              )}

              <span
                className={`shrink-0 rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${STATUS_STYLES[entry.status]}`}
              >
                {entry.status}
              </span>

              {entry.status === "COMPLETED" ? (
                <Link
                  to={`/analysis/${entry.id}`}
                  className="shrink-0 font-mono text-xs text-accent hover:underline"
                >
                  View →
                </Link>
              ) : (
                <span className="shrink-0 font-mono text-xs text-ink-faint">—</span>
              )}

              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="shrink-0 font-mono text-xs text-ink-faint transition-colors hover:text-evidence disabled:opacity-40"
              >
                {deletingId === entry.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
