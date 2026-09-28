import { useWorkspace } from "../../contexts/WorkspaceContext";

/**
 * ANALYSIS │ HISTORY — the two halves of the workspace, as one segmented
 * pill. These are views of the same place, not links to another page.
 */
export function PaneSwitch() {
  const { pane, setPane, entries } = useWorkspace();
  const count = entries?.length ?? 0;

  const item = (key: "analysis" | "history", label: string, badge?: string) => (
    <button
      key={key}
      role="tab"
      aria-selected={pane === key}
      onClick={() => setPane(key)}
      className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-body font-medium transition-colors ${
        pane === key ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink"
      }`}
    >
      <span>{label}</span>
      {badge && (
        <span className={pane === key ? "text-canvas/50" : "text-ink-dim"}>{badge}</span>
      )}
    </button>
  );

  return (
    <div
      role="tablist"
      aria-label="Workspace"
      className="grid grid-cols-2 gap-1 rounded-full border border-border bg-well p-1"
    >
      {item("analysis", "Analysis")}
      {item("history", "History", count > 0 ? String(count) : undefined)}
    </div>
  );
}
