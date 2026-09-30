/**
 * Report and favicon tests.
 *
 * The report model is checked for what it must contain and, as importantly,
 * what it must never contain (score, rule, thresholds, ids, confidence). The
 * PDF renderer is exercised end to end with tiny images; the button's
 * visibility is checked across the processing lifecycle.
 */
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PDFDocument } from "pdf-lib";
import type { Analysis, EvidenceMetrics, TamperingRisk } from "../types/analysis";
import { buildReportModel, isReportReady, reportFileName } from "../report/reportModel";
import { pdfSafe, renderReportPdf, type ReportImages } from "../report/renderPdf";
import indexHtml from "../../index.html?raw";
import faviconSvg from "../../public/favicon.svg?raw";

const { auth, workspace } = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>,
  workspace: {} as Record<string, unknown>,
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => auth,
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../contexts/WorkspaceContext", () => ({
  useWorkspace: () => workspace,
  WorkspaceProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../api/supabase", () => ({ supabase: {} }));

import { NavBar } from "../components/layout/NavBar";

/* --------------------------------------------------------------- Fixtures */

const metrics: EvidenceMetrics = {
  source: "heatmap",
  heatmapWidth: 290,
  heatmapHeight: 204,
  evidenceThreshold: 0.5,
  evidenceAreaFraction: 0.0162,
  evidencePixelCount: 960,
  maxIntensity: 0.974,
  meanIntensity: 0.1,
  meanEvidenceIntensity: 0.82,
  intensityHistogram: [1, 2, 3],
  regionCount: 2,
  largestRegionFraction: 0.0154,
  largestRegionShare: 0.95,
  strongIntensityThreshold: 0.8,
  strongAreaFraction: 0.0091,
  strongPixelCount: 540,
  strongRegionCount: 1,
  strongLargestRegionFraction: 0.0088,
  significantRegionBounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
};

const risk: TamperingRisk = {
  level: "HIGH",
  rule: "strong_localized_region",
  rationale: "RATIONALE-MUST-NOT-APPEAR",
  inputs: { maxIntensity: 0.974 },
};

function makeAnalysis(over: Partial<Analysis> = {}): Analysis {
  return {
    id: "3f1c9a2e-0000-4000-8000-DATABASEID",
    documentName: "Salary Slip (March).png",
    documentType: "image/png",
    pageCount: 1,
    status: "COMPLETED",
    stage: "REPORT",
    createdAt: "2026-09-30T10:15:00.000Z",
    pages: [{ pageNumber: 1, originalImageUrl: "blob:o", catnet: { heatmapUrl: "blob:h" } }],
    metrics,
    risk,
    narrative: {
      what_the_analysis_shows: ["Strong evidence concentrates in one region.", "Peak intensity reached 0.97."],
      interpretation: ["The region covers the net salary figure.", "A SECOND POINT MUST NOT APPEAR"],
      confidence: ["CONFIDENCE-MUST-NOT-APPEAR"],
    },
    ...over,
  };
}

// 1x1 PNG.
const PIXEL = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0),
);
const images = (width: number, height: number): ReportImages => ({
  original: { bytes: PIXEL, kind: "png", width, height },
  overlay: { bytes: PIXEL, kind: "png", width, height },
  overlayOpacity: 0.65,
});

/* ------------------------------------------------------------ Report model */

describe("report model", () => {
  it("names the file from the document only", () => {
    expect(reportFileName("Salary Slip (March).png")).toBe(
      "document-forensics-salary-slip-march-report.pdf",
    );
    expect(reportFileName("../../etc/passwd")).toBe("document-forensics-etc-passwd-report.pdf");
    expect(reportFileName("आधार.png")).toBe("document-forensics-document-report.pdf");
    expect(reportFileName("")).toBe("document-forensics-document-report.pdf");
  });

  it("carries the risk level, findings and exactly one interpretation", () => {
    const model = buildReportModel(makeAnalysis());
    expect(model.riskLevel).toBe("HIGH");
    expect(model.findings).toEqual([
      "Strong evidence concentrates in one region.",
      "Peak intensity reached 0.97.",
    ]);
    expect(model.interpretation).toBe("The region covers the net salary figure.");
    expect(model.interpretationUnavailable).toBe(false);
  });

  it("lists the six visible metrics plus the strong-evidence metrics, as the UI formats them", () => {
    const model = buildReportModel(makeAnalysis());
    const rows = Object.fromEntries(model.metricGroups.flatMap((g) => g.rows.map((r) => [r.label, r.value])));
    expect(model.metricGroups.map((g) => g.title)).toEqual(["Intensity", "Spread", "Strong evidence"]);
    expect(rows).toEqual({
      "Peak intensity": "0.97",
      "Mean (flagged)": "0.82",
      "Flagged area": "1.62%",
      Regions: "2",
      "Largest region": "1.54%",
      Concentration: "95%",
      "Strong-evidence area": "0.91%",
      "Strong regions": "1",
      "Largest strong region": "0.88%",
    });
  });

  it("never exposes the score, rule, thresholds, ids, region bounds or confidence", () => {
    const text = JSON.stringify(buildReportModel(makeAnalysis()));
    for (const forbidden of [
      /RATIONALE-MUST-NOT-APPEAR/,
      /strong_localized_region/,
      /CONFIDENCE-MUST-NOT-APPEAR/,
      /A SECOND POINT MUST NOT APPEAR/,
      /DATABASEID/,
      /\b0\.8\b/, // the strong-intensity threshold
      /\b0\.5\b/, // the evidence threshold
      /threshold/i,
      /score/i,
      /blob:/,
    ]) {
      expect(text).not.toMatch(forbidden);
    }
  });

  it("marks the interpretation unavailable instead of inventing one", () => {
    const model = buildReportModel(
      makeAnalysis({ narrative: undefined, narrativeError: "rate limited" }),
    );
    expect(model.interpretationUnavailable).toBe(true);
    expect(model.findings).toEqual([]);
    expect(model.interpretation).toBeNull();
    expect(model.riskLevel).toBe("HIGH");
    expect(model.metricGroups).toHaveLength(3);
  });

  it("reads analyses stored in the older prose format", () => {
    const model = buildReportModel(
      makeAnalysis({
        narrative: { observed_evidence: "OBS", location_description: "LOC", plain_language_meaning: "MEAN" },
      }),
    );
    expect(model.findings).toEqual(["OBS", "LOC"]);
    expect(model.interpretation).toBe("MEAN");
  });

  it("is ready only once the analysis is final", () => {
    const heatmapReady = { pageNumber: 1, originalImageUrl: "blob:o", catnet: { heatmapUrl: "blob:h" } };
    const noHeatmap = { ...heatmapReady, catnet: { heatmapUrl: "" } };
    expect(isReportReady(makeAnalysis({ status: "QUEUED", pages: [noHeatmap] }))).toBe(false);
    expect(isReportReady(makeAnalysis({ status: "PROCESSING", stage: "CATNET", pages: [noHeatmap] }))).toBe(false);
    // Evidence map on screen, interpretation still being written.
    expect(isReportReady(makeAnalysis({ status: "PROCESSING", stage: "NARRATIVE" }))).toBe(false);
    expect(isReportReady(makeAnalysis({ status: "FAILED" }))).toBe(false);
    expect(isReportReady(makeAnalysis())).toBe(true);
    expect(isReportReady(makeAnalysis({ narrative: undefined, narrativeError: "quota" }))).toBe(true);
    expect(isReportReady(null)).toBe(false);
  });
});

/* ------------------------------------------------------------ PDF renderer */

describe("PDF renderer", () => {
  it("makes symbols and locale spaces encodable and drops what it cannot encode", () => {
    expect(pdfSafe("px ≥ 0.5 · ₹ 48,200 — 10:15 PM")).toBe("px >= 0.5 · Rs 48,200 — 10:15 PM");
    expect(pdfSafe("आधार card")).toBe("card");
  });

  it("renders a valid PDF with the visualization on its own page", async () => {
    const bytes = await renderReportPdf(buildReportModel(makeAnalysis()), images(800, 1100));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    // updateMetadata: false, or load() itself would rewrite the Producer.
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(pdf.getTitle()).toBe("Analysis report - Salary Slip (March).png");
    expect(pdf.getProducer()).toBe("Document Forensics");
  });

  it("renders the degraded report and wide documents without error", async () => {
    const model = buildReportModel(makeAnalysis({ narrative: undefined, narrativeError: "quota" }));
    const bytes = await renderReportPdf(model, images(2400, 700));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("survives text the standard fonts cannot encode", async () => {
    const model = buildReportModel(
      makeAnalysis({
        documentName: "आधार कार्ड.png",
        narrative: { what_the_analysis_shows: ["Flagged ≥ 0.5 near “नाम” → ₹"], interpretation: ["x"] },
      }),
    );
    await expect(renderReportPdf(model, images(600, 800))).resolves.toBeInstanceOf(Uint8Array);
  });
});

/* ---------------------------------------------------------- Button in nav */

describe("Download Report button", () => {
  beforeEach(() => {
    Object.assign(auth, { session: {}, user: { email: "r@example.com" }, loading: false, signOut: vi.fn() });
  });

  function show(analysis: Analysis | null, activeId = "a1") {
    for (const key of Object.keys(workspace)) delete workspace[key];
    Object.assign(workspace, {
      activeId,
      clear: vi.fn(),
      analysis,
      activeDocument: analysis
        ? { id: analysis.id, documentName: analysis.documentName, status: analysis.status }
        : null,
    });
    return render(
      <MemoryRouter initialEntries={[`/w/${activeId}`]}>
        <NavBar />
      </MemoryRouter>,
    );
  }

  it("is hidden while the document is processing", () => {
    show(
      makeAnalysis({
        id: "a1",
        status: "PROCESSING",
        stage: "CATNET",
        pages: [{ pageNumber: 1, originalImageUrl: "blob:o", catnet: { heatmapUrl: "" } }],
      }),
    );
    expect(screen.queryByRole("button", { name: /download report/i })).toBeNull();
  });

  it("is hidden while the evidence map is ready but the interpretation is still generating", () => {
    show(makeAnalysis({ id: "a1", status: "PROCESSING", stage: "NARRATIVE" }));
    expect(screen.queryByRole("button", { name: /download report/i })).toBeNull();
    expect(screen.getByRole("button", { name: /new analysis/i })).toBeInTheDocument();
  });

  it("appears beside New analysis once the analysis is complete", () => {
    show(makeAnalysis({ id: "a1" }));
    expect(screen.getByRole("button", { name: /download report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new analysis/i })).toBeInTheDocument();
  });

  it("appears when the interpretation failed, so the report is never blocked by it", () => {
    show(makeAnalysis({ id: "a1", narrative: undefined, narrativeError: "quota" }));
    expect(screen.getByRole("button", { name: /download report/i })).toBeInTheDocument();
  });

  it("does not offer a report for an analysis that is not the one on stage", () => {
    show(makeAnalysis({ id: "a1" }), "a2");
    expect(screen.queryByRole("button", { name: /download report/i })).toBeNull();
  });
});

/* ---------------------------------------------------------------- Favicon */

describe("favicon", () => {
  it("links the Document Forensics icon and nothing from the Vite template", () => {
    expect(indexHtml).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon.svg"/);
    expect(indexHtml).toMatch(/apple-touch-icon/);
    expect(indexHtml).not.toMatch(/vite\.svg/i);
  });

  it("is the custom document mark, not the Vite lightning bolt", () => {
    expect(faviconSvg).toMatch(/<title>Document Forensics<\/title>/);
    expect(faviconSvg).not.toMatch(/#863bff/i);
  });
});
