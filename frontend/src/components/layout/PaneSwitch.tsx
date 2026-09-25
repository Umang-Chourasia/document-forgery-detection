import { useWorkspace } from "../../contexts/WorkspaceContext";

/**
 * ANALYSIS │ HISTORY — the two halves of the workspace, side by side.
 * An underline marks the active pane; these are not tabs to a different page
 * and not pills.
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
      className={`label flex flex-1 items-center justify-between gap-2 border-b py-4 transition-colors ${
        pane === key
          ? "border-accent text-ink"
          : "border-hairline text-ink-faint hover:text-ink-muted"
      }`}
    >
      <span>{label}</span>
      {badge && <span className="text-ink-faint">{badge}</span>}
    </button>
  );

  return (
    <div role="tablist" aria-label="Workspace" className="flex gap-7">
      {item("analysis", "Analysis")}
      {item("history", "History", count > 0 ? String(count) : undefined)}
    </div>
  );
}
