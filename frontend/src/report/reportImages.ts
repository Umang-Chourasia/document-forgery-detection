import { DEFAULT_OVERLAY_OPACITY } from "../lib/display";
import type { AnalysisPage } from "../types/analysis";
import type { ReportImage, ReportImages } from "./renderPdf";

/** Longest side of the images placed in the report. */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.9;

/**
 * Builds the report's two images from the analysis's own original and
 * heatmap — the same URLs the viewer shows (in-memory blobs for a live run,
 * short-lived signed URLs for one opened from history).
 *
 * The overlay is composited exactly as the viewer's Overlay mode draws it:
 * the heatmap fitted inside the original's frame without stretching, at the
 * viewer's default opacity. Both images are re-encoded copies made in memory;
 * nothing is written back, so the stored original stays byte-for-byte as
 * uploaded.
 */
export async function composeReportImages(page: AnalysisPage): Promise<ReportImages> {
  const [original, heatmap] = await Promise.all([
    loadBitmap(page.originalImageUrl),
    loadBitmap(page.catnet.heatmapUrl),
  ]);

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(original.width, original.height));
    const width = Math.max(1, Math.round(original.width * scale));
    const height = Math.max(1, Math.round(original.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");

    // White behind the page, as in the viewer, so transparent PNGs stay legible.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(original, 0, 0, width, height);
    const originalJpg = await toJpeg(canvas, width, height);

    // object-fit: contain — a heatmap whose aspect differs letterboxes rather
    // than stretching, the same rule the viewer follows.
    const fit = Math.min(width / heatmap.width, height / heatmap.height);
    const hw = heatmap.width * fit;
    const hh = heatmap.height * fit;
    ctx.globalAlpha = DEFAULT_OVERLAY_OPACITY;
    ctx.drawImage(heatmap, (width - hw) / 2, (height - hh) / 2, hw, hh);
    ctx.globalAlpha = 1;
    const overlayJpg = await toJpeg(canvas, width, height);

    return { original: originalJpg, overlay: overlayJpg, overlayOpacity: DEFAULT_OVERLAY_OPACITY };
  } finally {
    original.close();
    heatmap.close();
  }
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  if (!url) throw new Error("The document images are not available.");
  const response = await fetch(url);
  if (!response.ok) throw new Error("The document images could not be loaded.");
  return createImageBitmap(await response.blob());
}

function toJpeg(canvas: HTMLCanvasElement, width: number, height: number): Promise<ReportImage> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error("The report images could not be encoded."));
        resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), kind: "jpg", width, height });
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
