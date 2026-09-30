import type { Analysis } from "../types/analysis";
import { buildReportModel } from "./reportModel";
import { composeReportImages } from "./reportImages";

/**
 * Builds the PDF for one completed analysis and hands it to the browser as a
 * download. Everything happens in memory on this device: no request carries
 * the report anywhere, nothing is stored server-side, and the object URL is
 * released once the download has started.
 *
 * The analysis is passed in by the caller at click time, so the report is
 * always of the analysis that was on screen when the button was pressed.
 */
export async function downloadReport(analysis: Analysis): Promise<void> {
  const page = analysis.pages[0];
  if (!page) throw new Error("This analysis has no page to report on.");

  const model = buildReportModel(analysis);
  const [{ renderReportPdf }, images] = await Promise.all([
    import("./renderPdf"),
    composeReportImages(page),
  ]);
  const bytes = await renderReportPdf(model, images);

  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = model.fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Give the browser a moment to start the download before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
