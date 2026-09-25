import { useWorkspace } from "../../contexts/WorkspaceContext";
import { HistoryPane } from "../workspace/HistoryPane";
import { AnalysisRail } from "../workspace/AnalysisRail";
import { PaneSwitch } from "./PaneSwitch";

/**
 * The left rail: the pane switch, then whichever pane is active.
 *
 * In ANALYSIS mode it carries the reading of whatever is on the stage —
 * risk first and prominent, then interpretation, then measured evidence.
 * In HISTORY mode it carries the session list.
 *
 * Below `lg` the rail sits above the stage and its content is height-capped
 * with its own scroll, so neither a long history nor a long reading pushes
 * the document off-screen.
 */
export function WorkspaceRail() {
  const { pane } = useWorkspace();

  return (
    <div className="flex h-full min-h-0 flex-col px-6 lg:px-8">
      <PaneSwitch />
      <div className="scroll-quiet max-h-[46svh] min-h-0 flex-1 overflow-y-auto py-6 pr-1 lg:max-h-none">
        {pane === "history" ? <HistoryPane /> : <AnalysisRail />}
      </div>
    </div>
  );
}
