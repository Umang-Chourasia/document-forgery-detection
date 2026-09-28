import { useWorkspace } from "../../contexts/WorkspaceContext";
import { AnalysisResult } from "../../pages/AnalysisResult";
import { UploadPane } from "../workspace/UploadPane";
import { WorkspaceRail } from "./WorkspaceRail";

/**
 * The single workspace. One shell, two panes in the rail, one stage on the
 * right — Analysis and History are views of the same place rather than
 * separate destinations.
 *
 * The provider lives in the Layout so the chrome shares it; this component
 * only lays the two columns out. At `lg` and above both are panels inside a
 * gutter and fill the viewport under the top bar; below it the rail stacks
 * above the stage.
 */
export function Workspace() {
  const { activeId } = useWorkspace();

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 sm:px-6 sm:pb-6 lg:grid lg:h-[calc(100svh-var(--spacing-nav))] lg:grid-cols-[var(--spacing-rail)_1fr] lg:gap-6">
      <aside className="lg:min-h-0">
        <WorkspaceRail />
      </aside>

      <section className="dots flex min-w-0 flex-col overflow-hidden rounded-panel border border-hairline bg-well lg:min-h-0">
        {activeId ? <AnalysisResult /> : <UploadPane />}
      </section>
    </div>
  );
}
