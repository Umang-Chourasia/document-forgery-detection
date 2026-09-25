import { useWorkspace } from "../contexts/WorkspaceContext";
import { DocumentStage } from "../components/document/DocumentStage";
import { ProcessingTimeline } from "../components/evidence/ProcessingTimeline";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";

/**
 * The stage: the document and nothing else.
 *
 * Identity lives in the chrome and the reading lives in the rail, so this
 * carries only the document itself — the largest thing on screen, which is
 * the point of the product. The analysis is polled once in the workspace
 * context and shared, so this does no fetching of its own.
 */
export function AnalysisResult() {
  const { analysis, analysisError, clear } = useWorkspace();

  if (analysisError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center px-8 py-16 lg:px-12">
        <p className="border-l border-evidence pl-3 text-small leading-relaxed text-evidence">
          {analysisError}
        </p>
        <Button variant="secondary" size="sm" onClick={clear} className="mt-6">
          New analysis
        </Button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-canvas-deep p-6">
        <Skeleton className="h-[60%] min-h-[18rem] w-[52%] min-w-[16rem]" />
      </div>
    );
  }

  const processing = analysis.status === "QUEUED" || analysis.status === "PROCESSING";
  const page = analysis.pages[0];

  if (processing && !page?.catnet.heatmapUrl) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-canvas-deep px-8 py-16">
        <ProcessingTimeline
          status={analysis.status}
          currentStage={analysis.stage}
          startedAt={analysis.createdAt}
        />
      </div>
    );
  }

  if (analysis.status === "FAILED") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center px-8 py-16 lg:px-12">
        <p className="label text-evidence">Analysis failed</p>
        <p className="mt-4 max-w-md text-body leading-relaxed text-ink-muted">
          {analysis.error ?? "The analysis could not be completed."} Try
          uploading the document again.
        </p>
        <Button variant="secondary" size="sm" onClick={clear} className="mt-8">
          New analysis
        </Button>
      </div>
    );
  }

  if (!page) return null;

  // `metrics.significantRegionBounds` is still computed, still persisted and
  // still drives the interpretation — it is simply no longer drawn over the
  // document.
  return <DocumentStage page={page} />;
}
