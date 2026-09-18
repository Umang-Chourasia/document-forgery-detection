import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteHistoryEntry, listHistory, type HistorySummary } from "../api/history";

export function History() {
  const [entries, setEntries] = useState<HistorySummary[] | null>(null);

  useEffect(() => {
    listHistory().then(setEntries);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteHistoryEntry(id);
    setEntries((prev) => prev?.filter((entry) => entry.id !== id) ?? null);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">History</p>
      <h1 className="mb-8 text-2xl font-medium text-ink">Past Analyses</h1>
      <p className="mb-8 max-w-lg text-sm text-ink-muted">
        Stored on this device only — there's no account system yet, so history isn't shared
        across browsers or machines.
      </p>

      {entries === null && <p className="font-mono text-sm text-ink-muted">Loading…</p>}

      {entries?.length === 0 && (
        <div className="rounded-sm border border-border bg-surface p-8 text-center">
          <p className="text-sm text-ink-muted">No analyses yet on this device.</p>
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
              <img
                src={entry.thumbnailUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-sm border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{entry.documentName}</p>
                <p className="font-mono text-xs text-ink-faint">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
              {entry.hasEvidence !== undefined && (
                <span
                  className={`shrink-0 rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${
                    entry.hasEvidence
                      ? "border-evidence/40 bg-evidence-soft text-evidence"
                      : "border-accent/40 bg-accent-soft text-accent"
                  }`}
                >
                  {entry.hasEvidence ? "Evidence" : "Clean"}
                </span>
              )}
              <Link
                to={`/analysis/${entry.id}`}
                className="shrink-0 font-mono text-xs text-accent hover:underline"
              >
                View →
              </Link>
              <button
                onClick={() => handleDelete(entry.id)}
                className="shrink-0 font-mono text-xs text-ink-faint transition-colors hover:text-evidence"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
