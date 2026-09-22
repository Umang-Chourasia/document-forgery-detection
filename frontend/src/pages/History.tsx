import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteAnalysisFromSupabase,
  listAnalysesFromSupabase,
  type SupabaseHistorySummary,
} from "../api/supabaseHistory";
import { RiskBadge } from "../components/evidence/RiskBadge";
import { StatusBadge } from "../components/evidence/StatusBadge";
import { Button, ButtonLink } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { SkeletonCard } from "../components/ui/Skeleton";

export function History() {
  const [entries, setEntries] = useState<SupabaseHistorySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Deletion is irreversible (row + stored files), so it takes two clicks.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
      setConfirmingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        eyebrow="History"
        title="Past Analyses"
        description="Your analyses are stored privately to your account. Documents and results are automatically deleted 7 days after analysis."
        right={
          <ButtonLink to="/analyze" size="sm">
            New analysis
          </ButtonLink>
        }
      />

      {error && (
        <Card tone="evidence" className="mb-6 px-4 py-3">
          <p className="text-sm text-evidence">{error}</p>
        </Card>
      )}

      {entries === null && (
        <div className="flex flex-col gap-3" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {entries?.length === 0 && !error && (
        <EmptyState
          icon={<DocumentGlyph />}
          title="No analyses yet"
          body="Upload a document image to see its localization heatmap, measured evidence and interpretation here."
          action={<ButtonLink to="/analyze">Run your first analysis</ButtonLink>}
        />
      )}

      {entries && entries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => {
            const isConfirming = confirmingId === entry.id;
            const isDeleting = deletingId === entry.id;

            return (
              <li key={entry.id}>
                <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition-colors hover:border-border-strong">
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

                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate text-sm text-ink">{entry.documentName}</p>
                    <p className="font-mono text-xs text-ink-faint">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                    {entry.status === "FAILED" && entry.error && (
                      <p className="mt-0.5 truncate font-mono text-xs text-evidence">
                        {entry.error}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {entry.riskLevel && (
                      <span className="flex items-center gap-1.5">
                        <span className="hidden font-mono text-[10px] uppercase tracking-wide text-ink-faint sm:inline">
                          Risk
                        </span>
                        <RiskBadge level={entry.riskLevel} size="sm" />
                      </span>
                    )}
                    <StatusBadge status={entry.status} size="sm" />
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {entry.status === "COMPLETED" ? (
                      <Link
                        to={`/analysis/${entry.id}`}
                        className="font-mono text-xs text-accent hover:underline"
                      >
                        View →
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-ink-faint">—</span>
                    )}

                    {isConfirming ? (
                      <span className="flex items-center gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting…" : "Confirm"}
                        </Button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          disabled={isDeleting}
                          className="font-mono text-xs text-ink-faint transition-colors hover:text-ink disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(entry.id)}
                        className="font-mono text-xs text-ink-faint transition-colors hover:text-evidence"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {isConfirming && (
                    <p className="w-full font-mono text-[11px] text-caution">
                      This permanently deletes the document, heatmap and result. It
                      cannot be undone.
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DocumentGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
      <path
        d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7l-4-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
