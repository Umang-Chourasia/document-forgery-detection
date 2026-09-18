/**
 * Mock implementation of the analysis API, used until the real backend
 * (/api/analyze etc., see api/analysis.ts) is ready. Everything in this
 * file is fake data for UI development — none of it represents a real
 * CAT-Net finding. Kept isolated here so swapping to the real API later
 * means deleting this file and the branch in analysis.ts, not touching
 * any page/component code.
 */
import { saveHistoryEntry } from "./history";
import type { Analysis, ProcessingStage } from "../types/analysis";

const store = new Map<string, Analysis>();

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMockHeatmap(width: number, height: number, seed: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, width, height);

  const rng = mulberry32(seed);
  const blobCount = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < blobCount; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const r = width * (0.08 + rng() * 0.14);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, "rgba(255, 92, 92, 0.9)");
    gradient.addColorStop(0.5, "rgba(255, 92, 92, 0.35)");
    gradient.addColorStop(1, "rgba(255, 92, 92, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = url;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STAGE_SEQUENCE: ProcessingStage[] = ["UPLOAD", "PREPROCESSING", "CATNET", "NARRATIVE", "REPORT"];
const STAGE_DELAY_MS = 900;

const MOCK_NARRATIVES = [
  "[Mock LLM narrative] CAT-Net's compression-artifact analysis highlights two localized regions with inconsistent JPEG quantization signatures relative to the rest of the page. This pattern is consistent with, but not proof of, localized re-compression from a paste-and-save edit.",
  "[Mock LLM narrative] No significant compression-artifact discontinuities were localized by CAT-Net across the page. The document's compression signature reads as uniform, which is consistent with an unedited scan.",
];

async function simulateProcessing(id: string) {
  for (const stage of STAGE_SEQUENCE) {
    await new Promise((r) => setTimeout(r, STAGE_DELAY_MS));
    const current = store.get(id);
    if (!current) return;
    store.set(id, { ...current, status: "PROCESSING", stage });
  }

  const current = store.get(id);
  if (!current) return;

  const page = current.pages[0];
  const { width, height } = await readImageDimensions(page.originalImageUrl);
  const seed = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const heatmapUrl = generateMockHeatmap(width, height, seed);
  const hasEvidence = seed % 2 === 0;

  const completed: Analysis = {
    ...current,
    status: "COMPLETED",
    stage: "REPORT",
    pages: [{ ...page, catnet: { heatmapUrl, hasEvidence } }],
    narrative: { summary: MOCK_NARRATIVES[hasEvidence ? 0 : 1] },
  };
  store.set(id, completed);
  void saveHistoryEntry(completed);
}

export async function mockCreateAnalysis(file: File): Promise<Analysis> {
  const id = crypto.randomUUID();
  const originalImageUrl = await readFileAsDataUrl(file);

  const analysis: Analysis = {
    id,
    documentName: file.name,
    documentType: file.type || "image",
    pageCount: 1,
    status: "QUEUED",
    stage: "UPLOAD",
    createdAt: new Date().toISOString(),
    pages: [
      {
        pageNumber: 1,
        originalImageUrl,
        catnet: { heatmapUrl: "", hasEvidence: false },
      },
    ],
  };

  store.set(id, analysis);
  void simulateProcessing(id);
  return analysis;
}

export async function mockGetAnalysis(id: string): Promise<Analysis> {
  const analysis = store.get(id);
  if (!analysis) {
    throw new Error(`No mock analysis found for id ${id}`);
  }
  return analysis;
}
