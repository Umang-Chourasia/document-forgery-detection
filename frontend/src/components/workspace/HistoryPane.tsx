import { useState } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { RiskBadge } from "../evidence/RiskBadge";
import { Skeleton } from "../ui/Skeleton";
import type { SupabaseHistorySummary } from "../../api/supabaseHistory";

/**
 * The history rail: a flat, date-grouped list of past analyses. Selecting one
 * loads it into the same stage — no navigation away, no separate workflow.
 *
 * Deletion keeps the previous two-step confirm exactly, because it is
 * irreversible: it removes the stored document, the heatmap and the row.
 */
export function HistoryPane() {
  const { entries, historyError, activeId, select, remove } = useWorkspace();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await remove(id);
    } catch {
      /* error surfaces through historyError */
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  if (historyError) {
    return (
      <p className="rounded-card bg-evidence-soft px-6 py-5 text-small leading-relaxed text-evidence">
        {historyError}
      </p>
    );
  }

  if (entries === null) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-card bg-surface p-3">
            <Skeleton className="h-12 w-12 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-2.5 w-3/5" />
              <Skeleton className="h-2 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-card border border-hairline bg-surface px-7 py-6 text-body leading-relaxed text-ink-muted">
        No analyses yet. Upload a document to begin — results appear here and
        stay for seven days.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {groupByDate(entries).map((group) => (
        <section key={group.label}>
          <p className="label sticky top-0 z-[1] bg-canvas px-1 pb-3 pt-4 text-ink-faint">
            {group.label}
          </p>
          <ul className="flex flex-col gap-2">
            {group.items.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                active={entry.id === activeId}
                confirming={confirmingId === entry.id}
                deleting={deletingId === entry.id}
                onSelect={() => select(entry.id)}
                onAskDelete={() => setConfirmingId(entry.id)}
                onCancelDelete={() => setConfirmingId(null)}
                onConfirmDelete={() => handleDelete(entry.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface RowProps {
  entry: SupabaseHistorySummary;
  active: boolean;
  confirming: boolean;
  deleting: boolean;
  onSelect: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function HistoryRow({
  entry, active, confirming, deleting,
  onSelect, onAskDelete, onCancelDelete, onConfirmDelete,
}: RowProps) {
  return (
    <li
      className={`group rounded-card border transition-colors ${
        active
          ? "border-border-strong bg-surface-raised"
          : "border-hairline bg-surface hover:border-border"
      }`}
    >
      <div className="flex items-center gap-3 py-3 pl-3 pr-4">
        <button
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-control text-left"
          aria-current={active ? "true" : undefined}
        >
          <span
            className={`h-12 w-12 shrink-0 overflow-hidden rounded-control border bg-well ${
              active ? "border-ink/40" : "border-border"
            }`}
          >
            {entry.thumbnailUrl ? (
              <img src={entry.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-body text-ink">{entry.documentName}</span>
            <span className="mt-0.5 block font-mono text-[0.8125rem] text-ink-faint">
              {new Date(entry.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {entry.status !== "COMPLETED" ? ` · ${entry.status}` : ""}
            </span>
          </span>

          {entry.riskLevel && <RiskBadge level={entry.riskLevel} size="sm" />}
        </button>

        {confirming ? (
          <span className="flex shrink-0 items-center gap-2">
            <button
              onClick={onConfirmDelete}
              disabled={deleting}
              className="text-small font-medium text-evidence transition-colors hover:text-evidence/80 disabled:opacity-40"
            >
              {deleting ? "Deleting" : "Confirm"}
            </button>
            <button
              onClick={onCancelDelete}
              disabled={deleting}
              className="text-small text-ink-faint transition-colors hover:text-ink disabled:opacity-40"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={onAskDelete}
            aria-label={`Delete ${entry.documentName}`}
            className="shrink-0 text-small text-ink-faint opacity-0 transition-opacity hover:text-evidence focus-visible:opacity-100 group-hover:opacity-100"
          >
            Delete
          </button>
        )}
      </div>

      {confirming && (
        <p className="px-4 pb-3 text-small leading-relaxed text-caution">
          Permanently deletes the document and result
        </p>
      )}
    </li>
  );
}

/** Today / Yesterday / Previous 7 days / Older — newest first, as returned. */
function groupByDate(entries: SupabaseHistorySummary[]) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const day = 86_400_000;

  const buckets: { label: string; items: SupabaseHistorySummary[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const entry of entries) {
    const at = startOfDay(new Date(entry.createdAt));
    if (at === today) buckets[0].items.push(entry);
    else if (at === today - day) buckets[1].items.push(entry);
    else if (at > today - 7 * day) buckets[2].items.push(entry);
    else buckets[3].items.push(entry);
  }

  return buckets.filter((b) => b.items.length > 0);
}
