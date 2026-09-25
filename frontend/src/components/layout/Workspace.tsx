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
 * only lays the two columns out. The rail is a fixed column at `lg` and above
 * and stacks above the stage below it.
 */
export function Workspace() {
  const { activeId } = useWorkspace();

  return (
    <div className="lg:grid lg:h-[calc(100svh-4.25rem)] lg:grid-cols-[var(--spacing-rail)_1fr]">
      <aside className="border-b border-hairline py-2 lg:min-h-0 lg:border-b-0 lg:border-r lg:py-4">
        <WorkspaceRail />
      </aside>

      <section className="flex min-w-0 flex-col lg:min-h-0">
        {activeId ? <AnalysisResult /> : <UploadPane />}
      </section>
    </div>
  );
}
