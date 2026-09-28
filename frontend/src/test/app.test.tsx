/**
 * Regression suite for the frontend.
 *
 * Covers the redesigned screens and, more importantly, the behaviour the
 * redesign must not change: the two-phase processing status, level-only risk
 * display, the two-section interpretation, unrounded measured values, the
 * viewer controls, two-step deletion, and the terminology rule (no model or
 * vendor names in user-facing text).
 *
 * Auth, workspace and network modules are mocked, so nothing here talks to
 * Supabase, the localization server or the narrative service.
 */
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type {
  Analysis,
  EvidenceMetrics,
  NarrativeEvidence,
  RiskLevel,
  TamperingRisk,
} from "../types/analysis";
import type { SupabaseHistorySummary } from "../api/supabaseHistory";
import indexHtml from "../../index.html?raw";
import indexCss from "../index.css?raw";

import { Landing } from "../pages/Landing";
import { Login } from "../pages/Login";
import { Signup } from "../pages/Signup";
import { NavBar } from "../components/layout/NavBar";
import { PaneSwitch } from "../components/layout/PaneSwitch";
import { AnalysisRail } from "../components/workspace/AnalysisRail";
import { HistoryPane } from "../components/workspace/HistoryPane";
import { UploadPane } from "../components/workspace/UploadPane";
import { DocumentStage } from "../components/document/DocumentStage";
import { RiskCard } from "../components/evidence/RiskCard";
import { RiskBadge } from "../components/evidence/RiskBadge";
import { StatusBadge } from "../components/evidence/StatusBadge";
import { NarrativePanel } from "../components/evidence/NarrativePanel";

/* ------------------------------------------------------------------ Mocks */

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

vi.mock("../api/supabase", () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn() } },
  RETENTION_CONSENT_VERSION: "test",
  RETENTION_DAYS: 7,
  RETENTION_CONSENT_TEXT: "I agree to the retention notice.",
}));

vi.mock("../api/analysis", () => ({ createAnalysis: vi.fn() }));

function signedOut() {
  Object.assign(auth, { session: null, user: null, loading: false, signOut: vi.fn() });
}

function signedIn(email = "reviewer@example.com") {
  Object.assign(auth, { session: {}, user: { email }, loading: false, signOut: vi.fn() });
}

function setWorkspace(over: Record<string, unknown> = {}) {
  for (const key of Object.keys(workspace)) delete workspace[key];
  Object.assign(
    workspace,
    {
      pane: "analysis",
      setPane: vi.fn(),
      activeId: undefined,
      select: vi.fn(),
      clear: vi.fn(),
      entries: [],
      historyError: null,
      refresh: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
      analysis: null,
      analysisError: null,
      activeDocument: null,
    },
    over,
  );
}

beforeEach(() => {
  signedOut();
  setWorkspace();
});

/* --------------------------------------------------------------- Fixtures */

const metrics: EvidenceMetrics = {
  source: "heatmap",
  heatmapWidth: 512,
  heatmapHeight: 640,
  evidenceThreshold: 0.5,
  evidenceAreaFraction: 0.0123,
  evidencePixelCount: 4030,
  maxIntensity: 0.874,
  meanIntensity: 0.12,
  meanEvidenceIntensity: 0.66,
  intensityHistogram: [10, 5, 3, 2, 1],
  regionCount: 2,
  largestRegionFraction: 0.0045,
  largestRegionShare: 0.8,
};

const risk: TamperingRisk = {
  level: "HIGH",
  rule: "strong_localized_region",
  rationale: "RATIONALE-SHOULD-NOT-RENDER",
  inputs: { maxIntensity: 0.874, largestRegionFraction: 0.0045 },
};

const narrative: NarrativeEvidence = {
  what_the_analysis_shows: ["Evidence concentrates in one compact region."],
  interpretation: ["The region sits over the amount field."],
  confidence: ["CONFIDENCE-SHOULD-NOT-RENDER"],
};

function makeAnalysis(over: Partial<Analysis> = {}): Analysis {
  return {
    id: "a1",
    documentName: "invoice.png",
    documentType: "image/png",
    pageCount: 1,
    status: "COMPLETED",
    stage: "REPORT",
    createdAt: new Date().toISOString(),
    pages: [
      { pageNumber: 1, originalImageUrl: "blob:original", catnet: { heatmapUrl: "blob:heatmap" } },
    ],
    ...over,
  };
}

function historyEntry(over: Partial<SupabaseHistorySummary> = {}): SupabaseHistorySummary {
  return {
    id: "h1",
    documentName: "payslip.png",
    documentType: "image/png",
    createdAt: new Date().toISOString(),
    status: "COMPLETED",
    riskLevel: "HIGH",
    thumbnailUrl: "",
    ...over,
  };
}

function renderAt(ui: ReactElement, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

/** User-facing text must never name the model, the vendor, or a probability. */
const FORBIDDEN_TERMS = /cat-?net|gemini|google|\bmodel\b|probability|confidence/i;

/* ------------------------------------------------------------ Dark theme */

describe("dark-only theme", () => {
  it("declares a dark colour scheme in the HTML shell", () => {
    expect(indexHtml).toMatch(/<meta name="color-scheme" content="dark"/);
  });

  it("locks color-scheme to dark and ships no light theme", () => {
    expect(indexCss).toMatch(/color-scheme:\s*dark/);
    expect(indexCss).not.toMatch(/prefers-color-scheme:\s*light/);
    expect(indexCss).not.toMatch(/data-theme/);
  });

  it("uses the near-black canvas", () => {
    expect(indexCss).toMatch(/--color-canvas:\s*#020108/);
  });
});

/* ---------------------------------------------------------------- Landing */

describe("Landing page", () => {
  it("renders the hero headline and primary action", () => {
    renderAt(<Landing />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /every document,\s*examined/i,
    );
    expect(screen.getAllByRole("link", { name: /get started/i })[0]).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("has overview, how-it-works and FAQ sections", () => {
    const { container } = renderAt(<Landing />);
    for (const id of ["overview", "how-it-works", "faq"]) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("lists the four how-it-works steps in order", () => {
    const { container } = renderAt(<Landing />);
    const section = container.querySelector<HTMLElement>("#how-it-works")!;
    const steps = within(section).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => within(s).getByRole("heading").textContent)).toEqual([
      "Upload the document",
      "Localize the evidence",
      "Measure the risk",
      "Review and interpret",
    ]);
  });

  it("switches the specimen between the four view modes", () => {
    renderAt(<Landing />);
    const figure = screen.getByText(/illustrative example/i).closest("figure")!;
    const layers = () =>
      Array.from(figure.querySelectorAll("svg[data-layer]")).map((el) =>
        el.getAttribute("data-layer"),
      );

    const tabs = within(screen.getByRole("tablist", { name: /view mode/i })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Original", "Heatmap", "Overlay", "Side by side"]);
    expect(screen.getByRole("tab", { name: "Overlay" })).toHaveAttribute("aria-selected", "true");
    expect(layers()).toEqual(["overlay"]);

    fireEvent.click(screen.getByRole("tab", { name: "Heatmap" }));
    expect(screen.getByRole("tab", { name: "Heatmap" })).toHaveAttribute("aria-selected", "true");
    expect(layers()).toEqual(["heatmap"]);

    fireEvent.click(screen.getByRole("tab", { name: "Side by side" }));
    expect(layers()).toEqual(["original", "heatmap"]);
  });

  it("opens one FAQ answer at a time", () => {
    const { container } = renderAt(<Landing />);
    const faq = container.querySelector<HTMLElement>("#faq")!;
    const questions = within(faq).getAllByRole("button");
    expect(questions).toHaveLength(4);
    expect(questions[0]).toHaveAttribute("aria-expanded", "true");
    expect(questions[1]).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(questions[1]);
    expect(questions[0]).toHaveAttribute("aria-expanded", "false");
    expect(questions[1]).toHaveAttribute("aria-expanded", "true");
    expect(within(faq).getByText(/JPEG, PNG or WebP images of a single page/)).toBeInTheDocument();

    fireEvent.click(questions[1]);
    expect(questions[1]).toHaveAttribute("aria-expanded", "false");
  });

  it("sends signed-in visitors to the workspace", () => {
    signedIn();
    renderAt(<Landing />);
    expect(screen.getByRole("link", { name: /analyze a document/i })).toHaveAttribute("href", "/w");
    expect(screen.getByRole("link", { name: /open workspace/i })).toHaveAttribute("href", "/w");
    expect(screen.queryByRole("link", { name: /get started/i })).toBeNull();
  });

  it("names no model or vendor and shows no percentages", () => {
    renderAt(<Landing />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(FORBIDDEN_TERMS);
    expect(text).not.toMatch(/\d\s*%/);
  });
});

/* ----------------------------------------------------------------- NavBar */

describe("NavBar", () => {
  it("shows section links and sign-in actions to signed-out visitors", () => {
    renderAt(<NavBar />, "/");
    const sections = screen.getByRole("navigation", { name: /sections/i });
    expect(
      within(sections)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["#overview", "#how-it-works", "#faq"]);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup");
  });

  it("shows the loaded document, New analysis and the account initial in the workspace", () => {
    signedIn("reviewer@example.com");
    setWorkspace({
      activeId: "a1",
      activeDocument: { id: "a1", documentName: "invoice.png", status: "COMPLETED", riskLevel: "HIGH" },
    });
    renderAt(<NavBar />, "/w/a1");

    expect(screen.getByText("invoice.png")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();

    const account = screen.getByRole("button", { name: /account: reviewer@example.com/i });
    expect(account).toHaveTextContent("R");
    expect(screen.queryByText("reviewer@example.com")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /new analysis/i }));
    expect(workspace.clear).toHaveBeenCalledTimes(1);

    // History lives in the rail, not in the global chrome.
    expect(screen.queryByRole("link", { name: /history/i })).toBeNull();
  });

  it("reveals the email and Log out inside the account menu", () => {
    signedIn("reviewer@example.com");
    renderAt(<NavBar />, "/w");
    fireEvent.click(screen.getByRole("button", { name: /account: reviewer@example.com/i }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("reviewer@example.com")).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitem", { name: /log out/i }));
    expect(auth.signOut).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------ Analysis rail */

describe("Analysis rail", () => {
  it("shows guidance when no document is loaded", () => {
    render(<AnalysisRail />);
    expect(screen.getByText(/what happens next/i)).toBeInTheDocument();
  });

  it("says 'Processing document' only until the evidence map exists", () => {
    setWorkspace({
      activeId: "a1",
      analysis: makeAnalysis({
        status: "PROCESSING",
        stage: "CATNET",
        pages: [{ pageNumber: 1, originalImageUrl: "blob:o", catnet: { heatmapUrl: "" } }],
      }),
    });
    render(<AnalysisRail />);
    expect(screen.getByText("Processing document")).toBeInTheDocument();
    expect(screen.getByText(/analyzing evidence/i)).toBeInTheDocument();
    expect(screen.queryByText(/evidence map ready/i)).toBeNull();
  });

  it("switches to 'Evidence map ready' once the heatmap exists", () => {
    setWorkspace({
      activeId: "a1",
      analysis: makeAnalysis({ status: "PROCESSING", stage: "NARRATIVE" }),
    });
    render(<AnalysisRail />);
    expect(screen.getByText("Evidence map ready")).toBeInTheDocument();
    expect(screen.getByText("Heatmap generated successfully.")).toBeInTheDocument();
    expect(screen.getByText("Generating interpretation…")).toBeInTheDocument();
    expect(screen.queryByText("Processing document")).toBeNull();
  });

  it("renders risk, interpretation and measured evidence when complete", () => {
    setWorkspace({ activeId: "a1", analysis: makeAnalysis({ risk, narrative, metrics }) });
    render(<AnalysisRail />);

    expect(screen.queryByText(/generating interpretation/i)).toBeNull();
    expect(screen.getByText("Tampering Risk")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();

    expect(screen.getByText("What the analysis shows")).toBeInTheDocument();
    expect(screen.getByText("Evidence concentrates in one compact region.")).toBeInTheDocument();
    expect(screen.getByText("The region sits over the amount field.")).toBeInTheDocument();

    // Level only: no rule, rationale or confidence reaches the screen.
    expect(screen.queryByText(/RATIONALE-SHOULD-NOT-RENDER/)).toBeNull();
    expect(screen.queryByText(/strong_localized_region/)).toBeNull();
    expect(screen.queryByText(/CONFIDENCE-SHOULD-NOT-RENDER/)).toBeNull();
  });

  it("keeps measured values exactly as formatted from the metrics", () => {
    setWorkspace({ activeId: "a1", analysis: makeAnalysis({ risk, narrative, metrics }) });
    render(<AnalysisRail />);

    // Both panels are open as soon as the result shows — no manual expanding.
    expect(screen.getByRole("button", { name: /measured evidence/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Interpretation" })).toHaveAttribute("aria-expanded", "true");

    for (const value of ["1.23%", "0.87", "0.66", "2", "0.45%", "80%"]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText(/512×640/)).toBeInTheDocument();
  });

  it("re-opens collapsed panels when a different result is loaded", () => {
    setWorkspace({ activeId: "a1", analysis: makeAnalysis({ risk, narrative, metrics }) });
    const { rerender } = render(<AnalysisRail />);
    fireEvent.click(screen.getByRole("button", { name: "Interpretation" }));
    fireEvent.click(screen.getByRole("button", { name: /measured evidence/i }));
    expect(screen.getByRole("button", { name: "Interpretation" })).toHaveAttribute("aria-expanded", "false");

    setWorkspace({ activeId: "a2", analysis: makeAnalysis({ id: "a2", risk, narrative, metrics }) });
    rerender(<AnalysisRail />);
    expect(screen.getByRole("button", { name: "Interpretation" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /measured evidence/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("groups measurements into Intensity and Spread tiles and marks the rule's inputs", () => {
    setWorkspace({ activeId: "a1", analysis: makeAnalysis({ risk, narrative, metrics }) });
    render(<AnalysisRail />);

    expect(screen.getByText("Intensity")).toBeInTheDocument();
    expect(screen.getByText("Spread")).toBeInTheDocument();
    expect(screen.getByText("2 measurements")).toBeInTheDocument();
    expect(screen.getByText("4 measurements")).toBeInTheDocument();

    // Label, value and explanation stay together in one tile.
    const peak = screen.getByText("Peak intensity").closest("div")!;
    expect(within(peak).getByText("0.87")).toBeInTheDocument();
    expect(within(peak).getByText("Strongest single point on the heatmap")).toBeInTheDocument();

    // Only the keys present in risk.inputs carry the rule marker (plus the legend).
    expect(screen.getAllByLabelText("Read by the risk rule")).toHaveLength(2);
    expect(screen.getByText("Read by the risk rule")).toBeInTheDocument();
    expect(screen.getByText(/Heatmap 512×640/)).toBeInTheDocument();
  });

  it("degrades gracefully when the interpretation is unavailable", () => {
    setWorkspace({
      activeId: "a1",
      analysis: makeAnalysis({ risk, metrics, narrativeError: "Interpretation is temporarily unavailable." }),
    });
    render(<AnalysisRail />);
    expect(screen.getByText("Interpretation is temporarily unavailable.")).toBeInTheDocument();
    expect(screen.getByText(/risk level are unaffected/i)).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("offers a new analysis after a failure", () => {
    setWorkspace({
      activeId: "a1",
      analysis: makeAnalysis({ status: "FAILED", error: "Upstream failed." }),
    });
    render(<AnalysisRail />);
    expect(screen.getByText("Analysis failed")).toBeInTheDocument();
    expect(screen.getByText("Upstream failed.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /new analysis/i }));
    expect(workspace.clear).toHaveBeenCalledTimes(1);
  });

  it("names no model or vendor anywhere in a completed reading", () => {
    setWorkspace({ activeId: "a1", analysis: makeAnalysis({ risk, narrative, metrics }) });
    render(<AnalysisRail />);
    expect(document.body.textContent ?? "").not.toMatch(FORBIDDEN_TERMS);
  });
});

/* -------------------------------------------------------- Risk and badges */

describe("Risk and status display", () => {
  const WORDS: Record<RiskLevel, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

  it.each(Object.keys(WORDS) as RiskLevel[])("RiskCard shows %s as a word with no score", (level) => {
    const { container } = render(
      <RiskCard risk={{ level, rule: "rule_name", rationale: "why it was chosen" }} />,
    );
    expect(screen.getByText(WORDS[level])).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d/);
    expect(container.textContent).not.toMatch(/rule_name|why it was chosen/);
  });

  it("title-cases risk and status badges", () => {
    render(
      <>
        <RiskBadge level="MEDIUM" />
        <StatusBadge status="COMPLETED" />
        <StatusBadge status="PROCESSING" />
      </>,
    );
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("NarrativePanel numbers the findings and highlights figures without changing the text", () => {
    const shows = [
      "The analysis detected 4 localized regions, together covering 1.92 percent of the document.",
      "Peak evidence intensity reached 0.92.",
      "The largest region accounts for 70% of all detected evidence.",
    ];
    render(
      <NarrativePanel
        narrative={{
          what_the_analysis_shows: shows,
          interpretation: ["The highlighted region covers the signature."],
          confidence: ["CONFIDENCE-SHOULD-NOT-RENDER"],
        }}
      />,
    );

    expect(screen.getByText("What the analysis shows")).toBeInTheDocument();
    expect(screen.getByText("3 findings")).toBeInTheDocument();
    expect(screen.getByText("Key finding")).toBeInTheDocument();
    expect(screen.getByText("Most significant region")).toBeInTheDocument();

    // The text reaches the screen verbatim, point by point and in order.
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("p")!.textContent)).toEqual(shows);

    // Figures are marked; ordinary words are not.
    const marks = Array.from(document.querySelectorAll("mark")).map((m) => m.textContent);
    expect(marks).toEqual(["4", "1.92 percent", "0.92", "70%"]);

    expect(screen.getByText("The highlighted region covers the signature.")).toBeInTheDocument();
    expect(screen.queryByText(/CONFIDENCE-SHOULD-NOT-RENDER/)).toBeNull();
    expect(screen.getByText(/interpretation, not measurement/i)).toBeInTheDocument();
  });

  it("NarrativePanel collapses and expands from its heading", () => {
    render(<NarrativePanel narrative={{ what_the_analysis_shows: ["One point."] }} />);
    const toggle = screen.getByRole("button", { name: "Interpretation" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("One point.")).toBeNull();
  });

  it("NarrativePanel falls back to the legacy prose fields", () => {
    render(
      <NarrativePanel
        narrative={{
          observed_evidence: "OBSERVED",
          location_description: "LOCATION",
          plain_language_meaning: "MEANING",
        }}
      />,
    );
    for (const text of ["OBSERVED", "LOCATION", "MEANING"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});

/* -------------------------------------------------- Pane switch and history */

describe("Workspace panes", () => {
  it("switches between Analysis and History", () => {
    setWorkspace({ entries: [historyEntry(), historyEntry({ id: "h2" }), historyEntry({ id: "h3" })] });
    render(<PaneSwitch />);
    expect(screen.getByRole("tab", { name: /analysis/i })).toHaveAttribute("aria-selected", "true");
    const history = screen.getByRole("tab", { name: /history/i });
    expect(history).toHaveTextContent("3");
    fireEvent.click(history);
    expect(workspace.setPane).toHaveBeenCalledWith("history");
  });

  it("shows an empty history message", () => {
    render(<HistoryPane />);
    expect(screen.getByText(/no analyses yet/i)).toBeInTheDocument();
  });

  it("selects an entry and deletes only after confirmation", async () => {
    setWorkspace({ entries: [historyEntry()] });
    render(<HistoryPane />);

    fireEvent.click(screen.getByText("payslip.png"));
    expect(workspace.select).toHaveBeenCalledWith("h1");

    fireEvent.click(screen.getByRole("button", { name: /delete payslip.png/i }));
    expect(workspace.remove).not.toHaveBeenCalled();
    expect(screen.getByText(/permanently deletes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(workspace.remove).toHaveBeenCalledWith("h1"));
  });
});

/* ----------------------------------------------------------------- Viewer */

describe("Document viewer", () => {
  const page = makeAnalysis().pages[0];

  it("overlays the heatmap on the original by default", () => {
    render(<DocumentStage page={page} />);
    expect(screen.getByAltText("Page 1 original")).toBeInTheDocument();
    expect(screen.getByAltText("Page 1 analysis heatmap")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overlay" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches view modes", () => {
    render(<DocumentStage page={page} />);
    fireEvent.click(screen.getByRole("tab", { name: "Original" }));
    expect(screen.queryByAltText("Page 1 analysis heatmap")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Side by side" }));
    expect(screen.getByAltText("Page 1 original")).toBeInTheDocument();
    expect(screen.getByAltText("Page 1 analysis heatmap")).toBeInTheDocument();
  });

  it("zooms in steps and resets", () => {
    render(<DocumentStage page={page} />);
    expect(screen.getByText("1×")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("1.5×")).toBeInTheDocument();
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("4×")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(screen.getByText("1×")).toBeInTheDocument();
  });

  it("disables heatmap modes when there is no heatmap", () => {
    render(
      <DocumentStage page={{ ...page, catnet: { heatmapUrl: "" } }} />,
    );
    expect(screen.getByRole("tab", { name: "Heatmap" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Original" })).not.toBeDisabled();
  });
});

/* ----------------------------------------------------------------- Upload */

describe("Upload", () => {
  it("rejects unsupported files and accepts images", () => {
    const { container } = render(<UploadPane />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const run = screen.getByRole("button", { name: /run analysis/i });
    expect(run).toBeDisabled();

    fireEvent.change(input, {
      target: { files: [new File(["%PDF"], "doc.pdf", { type: "application/pdf" })] },
    });
    expect(screen.getByText(/unsupported document type/i)).toBeInTheDocument();
    expect(run).toBeDisabled();

    fireEvent.change(input, {
      target: { files: [new File(["png"], "scan.png", { type: "image/png" })] },
    });
    expect(screen.getByText("scan.png")).toBeInTheDocument();
    expect(screen.queryByText(/unsupported document type/i)).toBeNull();
    expect(run).toBeEnabled();
  });
});

/* ------------------------------------------------------------------- Auth */

describe("Auth pages", () => {
  it("renders the sign-in form", () => {
    renderAt(<Login />, "/login");
    expect(document.getElementById("login-email")).toBeInTheDocument();
    expect(document.getElementById("login-password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the sign-up form with the retention consent", () => {
    renderAt(<Signup />, "/signup");
    expect(document.getElementById("signup-email")).toBeInTheDocument();
    expect(document.getElementById("signup-consent")).toHaveAttribute("type", "checkbox");
    expect(screen.getByText("I agree to the retention notice.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });
});
