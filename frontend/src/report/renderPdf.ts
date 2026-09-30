import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import type { ReportModel } from "./reportModel";
import type { RiskLevel } from "../types/analysis";

/**
 * Draws the analysis report. Loaded on demand (dynamic import) so pdf-lib
 * never weighs on the app's initial bundle.
 *
 * A4 portrait, standard Helvetica, a dark header band that echoes the app,
 * then risk → what the analysis shows → interpretation → measured evidence,
 * and the document visualization on its own page.
 */

export interface ReportImage {
  bytes: Uint8Array;
  kind: "jpg" | "png";
  width: number;
  height: number;
}

export interface ReportImages {
  original: ReportImage;
  overlay: ReportImage;
  /** Opacity the heatmap was composited at, for the caption. */
  overlayOpacity: number;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 52;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 40;
const HEADER_BAND_H = 128;

const C = {
  ink: rgb(0.067, 0.067, 0.078),
  muted: rgb(0.34, 0.35, 0.39),
  faint: rgb(0.52, 0.53, 0.57),
  rule: rgb(0.88, 0.88, 0.9),
  panel: rgb(0.962, 0.962, 0.97),
  band: rgb(0.008, 0.004, 0.031),
  white: rgb(1, 1, 1),
  bandMuted: rgb(0.62, 0.62, 0.66),
  teal: rgb(0.1, 0.5, 0.45),
  tealTint: rgb(0.925, 0.965, 0.957),
  violet: rgb(0.38, 0.31, 0.8),
  violetTint: rgb(0.955, 0.948, 0.995),
  violetEdge: rgb(0.8, 0.77, 0.96),
  amber: rgb(0.6, 0.39, 0.06),
  amberTint: rgb(0.992, 0.965, 0.905),
  amberEdge: rgb(0.93, 0.83, 0.62),
};

const RISK_COLOR: Record<RiskLevel, RGB> = {
  LOW: rgb(0.1, 0.56, 0.32),
  MEDIUM: rgb(0.72, 0.46, 0.08),
  HIGH: rgb(0.8, 0.22, 0.2),
};

const RISK_WORD: Record<RiskLevel, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

/* ------------------------------------------------------------ Text safety */

// Characters the standard PDF fonts (WinAnsi) can encode beyond Latin-1.
const WIN_ANSI_EXTRA = new Set("\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178");
const REPLACE: Record<string, string> = {
  "\u2265": ">=", // ≥
  "\u2264": "<=", // ≤
  "\u2192": "->", // →
  "\u2190": "<-", // ←
  "\u20B9": "Rs ", // ₹
  "\u2212": "-", // minus sign
  "\u2011": "-", // non-breaking hyphen
  "\u00A0": " ", // no-break space
  "\u202F": " ", // narrow no-break space (some locales' times)
  "\u2009": " ", // thin space
  "\u200A": " ", // hair space
  "\u2007": " ", // figure space
};

/**
 * Makes text encodable by the standard fonts: common symbols are spelled out,
 * narrow spaces (which some locales put in dates) become spaces, and anything
 * else outside WinAnsi is dropped rather than failing the whole report.
 */
export function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    const replacement = REPLACE[ch];
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 32 && code < 127) || (code >= 0xa1 && code <= 0xff) || WIN_ANSI_EXTRA.has(ch)) {
      out += ch;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = pdfSafe(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    // A single word wider than the column is broken by character.
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let part = "";
      for (const ch of word) {
        if (font.widthOfTextAtSize(part + ch, size) > maxWidth) {
          lines.push(part);
          part = ch;
        } else {
          part += ch;
        }
      }
      line = part;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/* ------------------------------------------------------------- The writer */

class Writer {
  pages: PDFPage[] = [];
  page!: PDFPage;
  /** Distance of the cursor from the TOP of the page, in points. */
  y = 0;
  doc: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  documentName: string;

  constructor(doc: PDFDocument, regular: PDFFont, bold: PDFFont, documentName: string) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;
    this.documentName = documentName;
  }

  get bottom() {
    return PAGE_H - MARGIN - FOOTER_H;
  }

  addPage(first = false) {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    if (first) {
      this.y = HEADER_BAND_H + 34;
      return;
    }
    // Continuation header: a quiet running title and a rule.
    this.label("Document Forensics  ·  Analysis report", MARGIN, 36, 7.5, C.faint);
    const name = wrap(this.documentName, this.regular, 8, 240)[0];
    const w = this.regular.widthOfTextAtSize(name, 8);
    this.text(name, PAGE_W - MARGIN - w, 36, 8, this.regular, C.faint);
    this.hr(46);
    this.y = 72;
  }

  /** Starts a new page if `height` more points would run into the footer. */
  ensure(height: number) {
    if (this.y + height > this.bottom) this.addPage();
  }

  text(s: string, x: number, top: number, size: number, font: PDFFont, color: RGB) {
    this.page.drawText(pdfSafe(s), { x, y: PAGE_H - top - size * 0.78, size, font, color });
  }

  /**
   * Uppercase bold label — the report's equivalent of the app's mono labels.
   * No letter-spacing: spaced glyphs extract as "L A B E L", which breaks
   * search, copy and screen readers in the PDF.
   */
  label(s: string, x: number, top: number, size: number, color: RGB) {
    this.text(s.toUpperCase(), x, top, size, this.bold, color);
  }

  hr(top: number, x = MARGIN, width = CONTENT_W, color = C.rule) {
    this.page.drawRectangle({ x, y: PAGE_H - top, width, height: 0.75, color });
  }

  rect(x: number, top: number, width: number, height: number, color: RGB, border?: RGB) {
    this.page.drawRectangle({
      x,
      y: PAGE_H - top - height,
      width,
      height,
      color,
      ...(border ? { borderColor: border, borderWidth: 0.75 } : {}),
    });
  }

  /** Draws wrapped lines from the cursor; returns the height used. */
  paragraph(s: string, x: number, width: number, size: number, font: PDFFont, color: RGB, lh: number) {
    const lines = wrap(s, font, size, width);
    lines.forEach((line, i) => this.text(line, x, this.y + i * lh, size, font, color));
    return lines.length * lh;
  }

  section(title: string, color: RGB, minFollowing = 60) {
    this.ensure(34 + minFollowing);
    this.label(title, MARGIN, this.y, 8.5, color);
    this.hr(this.y + 16);
    this.y += 30;
  }
}

/* ----------------------------------------------------------------- Render */

export async function renderReportPdf(model: ReportModel, images: ReportImages): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Analysis report - ${model.documentName}`));
  doc.setSubject("Document forensics analysis report");
  doc.setAuthor("Document Forensics");
  doc.setCreator("Document Forensics");
  doc.setProducer("Document Forensics");
  doc.setKeywords(["document forensics", "analysis report"]);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, regular, bold, model.documentName);

  w.addPage(true);
  drawHeaderBand(w, model);
  drawMeta(w, model);
  drawRisk(w, model);
  drawNarrative(w, model);
  drawMeasured(w, model);
  await drawVisualization(w, doc, images);
  drawFooters(w);

  return doc.save();
}

function drawHeaderBand(w: Writer, model: ReportModel) {
  w.rect(0, 0, PAGE_W, HEADER_BAND_H, C.band);

  // Mark: a white tile holding the registration frame, as in the app.
  const x = MARGIN;
  w.rect(x, 38, 22, 22, C.white);
  const corners: [number, number, number, number][] = [
    [x + 5, 43, 5, 1.4], [x + 5, 43, 1.4, 5],
    [x + 12, 43, 5, 1.4], [x + 15.6, 43, 1.4, 5],
    [x + 5, 53.6, 5, 1.4], [x + 5, 50, 1.4, 5],
    [x + 12, 53.6, 5, 1.4], [x + 15.6, 50, 1.4, 5],
  ];
  for (const [cx, top, cw, ch] of corners) w.rect(cx, top, cw, ch, C.band);
  w.page.drawCircle({ x: x + 11, y: PAGE_H - 49, size: 2.6, borderColor: C.band, borderWidth: 1.3 });

  w.label("Document Forensics", x + 32, 44, 8, C.bandMuted);
  w.text("Analysis Report", MARGIN, 76, 26, w.bold, C.white);

  const generated = `Generated ${model.generatedAt}`;
  const gw = w.regular.widthOfTextAtSize(pdfSafe(generated), 8.5);
  w.text(generated, PAGE_W - MARGIN - gw, 47, 8.5, w.regular, C.bandMuted);
}

function drawMeta(w: Writer, model: ReportModel) {
  const colW = (CONTENT_W - 24) / 2;
  const cells: [string, string][] = [
    ["Document", model.documentName],
    ["Analysed", model.analysedAt],
    ["Report generated", model.generatedAt],
    ["Pages analysed", String(model.pageCount)],
  ];
  for (let row = 0; row < 2; row++) {
    let rowH = 0;
    for (let col = 0; col < 2; col++) {
      const [label, value] = cells[row * 2 + col];
      const x = MARGIN + col * (colW + 24);
      w.label(label, x, w.y, 7.5, C.faint);
      const lines = wrap(value, w.regular, 11, colW).slice(0, 2);
      lines.forEach((line, i) => w.text(line, x, w.y + 14 + i * 15, 11, w.regular, C.ink));
      rowH = Math.max(rowH, 14 + lines.length * 15);
    }
    w.y += rowH + 14;
  }
  w.hr(w.y);
  w.y += 22;
}

function drawRisk(w: Writer, model: ReportModel) {
  const note =
    "Decided by fixed rules on the measured evidence below, not by the AI interpretation. " +
    "It indicates how strongly the page shows signs of manipulation; it is not a verdict " +
    "on the document's authenticity.";
  const noteX = MARGIN + 200;
  const noteW = CONTENT_W - 200 - 22;
  const noteLines = wrap(note, w.regular, 9.5, noteW);
  const h = Math.max(104, 36 + noteLines.length * 14);

  w.ensure(h);
  const top = w.y;
  w.rect(MARGIN, top, CONTENT_W, h, C.panel);

  w.label("Tampering risk", MARGIN + 20, top + 20, 7.5, C.faint);
  const level = model.riskLevel;
  const word = level ? RISK_WORD[level] : "Not available";
  w.text(word, MARGIN + 20, top + 36, level ? 32 : 16, w.bold, level ? RISK_COLOR[level] : C.muted);

  if (level) {
    (["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).forEach((l, i) => {
      w.rect(MARGIN + 20 + i * 48, top + h - 22, 44, 3.5, l === level ? RISK_COLOR[l] : C.rule);
    });
  }

  noteLines.forEach((line, i) =>
    w.text(line, noteX, top + (h - noteLines.length * 14) / 2 + i * 14, 9.5, w.regular, C.muted),
  );
  w.y = top + h + 30;
}

function drawNarrative(w: Writer, model: ReportModel) {
  if (model.interpretationUnavailable) {
    w.section("Interpretation", C.violet, 70);
    const body =
      "The AI interpretation was unavailable for this analysis. The tampering risk, the " +
      "measured evidence and the document images in this report are unaffected.";
    const lines = wrap(body, w.regular, 10, CONTENT_W - 36);
    const h = 44 + lines.length * 14.5;
    w.ensure(h);
    w.rect(MARGIN, w.y, CONTENT_W, h, C.amberTint, C.amberEdge);
    w.text("AI interpretation unavailable", MARGIN + 18, w.y + 16, 11, w.bold, C.amber);
    lines.forEach((line, i) => w.text(line, MARGIN + 18, w.y + 36 + i * 14.5, 10, w.regular, C.muted));
    w.y += h + 30;
    return;
  }

  if (model.findings.length > 0) {
    w.section("What the analysis shows", C.violet, 50);
    model.findings.forEach((finding, i) => {
      const lines = wrap(finding, w.regular, 10.5, CONTENT_W - 28);
      const h = lines.length * 15.5;
      w.ensure(h + 10);
      w.page.drawCircle({
        x: MARGIN + 8,
        y: PAGE_H - w.y - 6,
        size: 7.5,
        borderColor: C.violetEdge,
        borderWidth: 0.9,
      });
      const n = String(i + 1);
      w.text(n, MARGIN + 8 - w.bold.widthOfTextAtSize(n, 7.5) / 2, w.y + 3, 7.5, w.bold, C.violet);
      lines.forEach((line, j) => w.text(line, MARGIN + 28, w.y + j * 15.5, 10.5, w.regular, C.ink));
      w.y += h + 10;
    });
    w.y += 18;
  }

  if (model.interpretation) {
    w.section("Interpretation", C.violet, 60);
    const lines = wrap(model.interpretation, w.bold, 11.5, CONTENT_W - 36);
    const h = 42 + lines.length * 17;
    w.ensure(h);
    w.rect(MARGIN, w.y, CONTENT_W, h, C.violetTint, C.violetEdge);
    w.label("Key finding  ·  Most significant region", MARGIN + 18, w.y + 15, 7.5, C.violet);
    lines.forEach((line, i) => w.text(line, MARGIN + 18, w.y + 32 + i * 17, 11.5, w.bold, C.ink));
    w.y += h + 12;
    w.text(
      "Generated from the measured evidence. Interpretation, not measurement.",
      MARGIN,
      w.y,
      8.5,
      w.regular,
      C.faint,
    );
    w.y += 30;
  }
}

function drawMeasured(w: Writer, model: ReportModel) {
  if (model.metricGroups.length === 0) return;
  w.section("Measured evidence", C.teal, 90);

  const valueW = 96;
  const labelW = CONTENT_W - valueW - 28;
  const rowH = 38;

  for (const group of model.metricGroups) {
    w.ensure(26 + group.rows.length * rowH);
    w.rect(MARGIN, w.y, CONTENT_W, 22, C.tealTint);
    w.label(group.title, MARGIN + 12, w.y + 7, 8, C.teal);
    w.y += 22;

    group.rows.forEach((row, i) => {
      const top = w.y;
      w.text(row.label, MARGIN + 12, top + 9, 10.5, w.bold, C.ink);
      w.text(wrap(row.description, w.regular, 8.5, labelW)[0], MARGIN + 12, top + 23, 8.5, w.regular, C.muted);
      const vw = w.bold.widthOfTextAtSize(pdfSafe(row.value), 15);
      w.text(row.value, MARGIN + CONTENT_W - 12 - vw, top + 11, 15, w.bold, C.ink);
      if (i < group.rows.length - 1) w.hr(top + rowH, MARGIN + 12, CONTENT_W - 24);
      w.y += rowH;
    });
    w.y += 14;
  }

  if (model.measurementBasis) {
    w.ensure(20);
    w.y += w.paragraph(model.measurementBasis, MARGIN, CONTENT_W, 8.5, w.regular, C.faint, 12);
  }
}

async function drawVisualization(w: Writer, doc: PDFDocument, images: ReportImages) {
  const embed = (img: ReportImage): Promise<PDFImage> =>
    img.kind === "jpg" ? doc.embedJpg(img.bytes) : doc.embedPng(img.bytes);
  const [original, overlay] = await Promise.all([embed(images.original), embed(images.overlay)]);

  // Always on its own page, so neither image is split or squeezed.
  w.addPage();
  w.section("Document visualization", C.ink, 200);

  const aspect = images.original.width / images.original.height;
  const captionH = 18;
  const noteH = 46;
  const available = w.bottom - w.y - noteH;
  const panels: [string, PDFImage][] = [
    ["Original document", original],
    ["Heatmap overlay", overlay],
  ];

  // Portrait pages sit side by side; wide ones stack, so each stays large.
  const sideBySide = aspect < 1.15;
  if (sideBySide) {
    const colW = (CONTENT_W - 18) / 2;
    let imgW = colW;
    let imgH = imgW / aspect;
    if (imgH > available - captionH) {
      imgH = available - captionH;
      imgW = imgH * aspect;
    }
    panels.forEach(([caption, image], i) => {
      const colX = MARGIN + i * (colW + 18);
      const x = colX + (colW - imgW) / 2;
      w.label(caption, x, w.y, 7.5, C.muted);
      drawFramed(w, image, x, w.y + captionH, imgW, imgH);
    });
    w.y += captionH + imgH + 20;
  } else {
    let imgW = CONTENT_W;
    let imgH = imgW / aspect;
    const maxEach = (available - 2 * captionH - 18) / 2;
    if (imgH > maxEach) {
      imgH = maxEach;
      imgW = imgH * aspect;
    }
    const x = MARGIN + (CONTENT_W - imgW) / 2;
    for (const [caption, image] of panels) {
      w.label(caption, x, w.y, 7.5, C.muted);
      drawFramed(w, image, x, w.y + captionH, imgW, imgH);
      w.y += captionH + imgH + 18;
    }
  }

  const pct = Math.round(images.overlayOpacity * 100);
  w.y += w.paragraph(
    `Heatmap overlay: the evidence heatmap drawn over the original at ${pct}% opacity, as in the ` +
      "viewer's Overlay mode. Warmer colours mark stronger localized evidence; blue marks little " +
      "or none. Images are reduced copies made for this report; the stored original is unchanged.",
    MARGIN,
    CONTENT_W,
    8.5,
    w.regular,
    C.faint,
    12,
  );
}

function drawFramed(w: Writer, image: PDFImage, x: number, top: number, width: number, height: number) {
  w.page.drawImage(image, { x, y: PAGE_H - top - height, width, height });
  w.page.drawRectangle({
    x,
    y: PAGE_H - top - height,
    width,
    height,
    borderColor: C.rule,
    borderWidth: 0.75,
  });
}

function drawFooters(w: Writer) {
  const total = w.pages.length;
  w.pages.forEach((page, i) => {
    w.page = page;
    const top = PAGE_H - MARGIN - 14;
    w.hr(top - 8);
    w.text(
      "Document Forensics  ·  Evidence for review, not a verdict of authenticity",
      MARGIN,
      top,
      7.5,
      w.regular,
      C.faint,
    );
    const label = `Page ${i + 1} of ${total}`;
    const lw = w.regular.widthOfTextAtSize(label, 7.5);
    w.text(label, PAGE_W - MARGIN - lw, top, 7.5, w.regular, C.faint);
  });
}
