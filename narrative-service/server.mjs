import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { computeHeatmapMetrics, classifyTamperingRisk, RISK_RULES } from "./metrics.mjs";

const PORT = process.env.PORT || 4000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set. Create a .env file (see .env.example).");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * The narrative model is given the measured evidence and the already-decided
 * risk level. It explains; it does not classify. The tampering risk is
 * computed deterministically in metrics.mjs before this prompt is built, and
 * the model is told so explicitly so it cannot present the level as its own
 * judgement — or quietly disagree with it.
 */
const SYSTEM_INSTRUCTION = `You are assisting a forensic document reviewer.

You are given, in this order:
1. MEASURED EVIDENCE — deterministic statistics computed from a CAT-Net
   heatmap, plus a Tampering Risk level that has ALREADY been decided by a
   fixed rule over those statistics. You do not decide the risk level.
2. The ORIGINAL document image.
3. The CAT-Net HEATMAP, where warm colours (red/orange) mark regions whose
   JPEG compression history is locally inconsistent with the rest of the
   image, and cool colours (blue) mark regions where no such inconsistency
   was found.

CAT-Net localizes compression inconsistencies. It is not a forgery detector
and produces no authenticity score. The statistics are measurements of the
rendered heatmap, not model confidence values.

Write for a human reviewer who must reach their own conclusion.

Rules:
- Never declare the document "fake", "forged", "authentic", "genuine", or
  give an overall verdict. Describe evidence; do not adjudicate.
- Never contradict or restate the supplied Tampering Risk as if you chose
  it. You may explain what the measurements behind it mean.
- Never invent numbers. Only refer to figures you were given.
- When the evidence supports it, you may name a POSSIBLE manipulation
  pattern (copy-move, splicing, text or region replacement, compositing, or
  uncertain), phrased as an estimate — "consistent with a possible splice",
  never "this is a splice". If the evidence does not support naming one, use
  "uncertain".
- If nothing meaningful is flagged, say so plainly and do not speculate.
- Keep each field concise and plain-language. No markdown, no bullet points.`;

/** Schema for the structured narrative, so the UI can render fields reliably. */
const NARRATIVE_SCHEMA = {
  type: "object",
  properties: {
    observed_evidence: {
      type: "string",
      description: "What the heatmap literally shows. Measured facts only.",
    },
    location_description: {
      type: "string",
      description: "Where flagged regions appear in the image, in plain terms.",
    },
    plain_language_meaning: {
      type: "string",
      description: "What this evidence means for a reviewer, without a verdict.",
    },
    possible_pattern: {
      type: "string",
      enum: ["copy-move", "splicing", "text-replacement", "compositing", "uncertain"],
    },
    pattern_reasoning: {
      type: "string",
      description: "Why the evidence is consistent with that possible pattern.",
    },
    pattern_confidence: { type: "string", enum: ["low", "medium", "high"] },
    caveats: { type: "string", description: "Limits of this interpretation." },
  },
  required: [
    "observed_evidence",
    "location_description",
    "plain_language_meaning",
    "possible_pattern",
    "pattern_reasoning",
    "pattern_confidence",
    "caveats",
  ],
};

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.get("/", (_req, res) => {
  res.json({ status: "narrative service is running" });
});

function buildEvidencePrompt(metrics, risk) {
  return [
    "MEASURED EVIDENCE (deterministic, computed from the rendered heatmap):",
    JSON.stringify(
      {
        tampering_risk: risk.level,
        risk_rule: risk.rule,
        risk_rationale: risk.rationale,
        evidence_area_percent: +(metrics.evidenceAreaFraction * 100).toFixed(3),
        max_intensity: metrics.maxIntensity,
        mean_intensity_overall: metrics.meanIntensity,
        mean_intensity_within_flagged_regions: metrics.meanEvidenceIntensity,
        flagged_region_count: metrics.regionCount,
        largest_region_percent_of_image: +(metrics.largestRegionFraction * 100).toFixed(3),
        largest_region_share_of_flagged_area: +(metrics.largestRegionShare * 100).toFixed(1),
        intensity_histogram_10_bands: metrics.intensityHistogram,
        evidence_threshold: metrics.evidenceThreshold,
      },
      null,
      2,
    ),
    "",
    `Thresholds used by the fixed rule: evidence floor ${RISK_RULES.minEvidenceAreaFraction * 100}% area ` +
      `and ${RISK_RULES.minMaxIntensity} intensity; HIGH requires ${RISK_RULES.highEvidenceAreaFraction * 100}% area ` +
      `with a single region covering ${RISK_RULES.highLargestRegionFraction * 100}% of the image.`,
    "",
    "Explain this evidence for the reviewer. The risk level is already decided; do not re-decide it.",
  ].join("\n");
}

app.post(
  "/api/narrate",
  upload.fields([{ name: "original", maxCount: 1 }, { name: "heatmap", maxCount: 1 }]),
  async (req, res) => {
    const originalFile = req.files?.original?.[0];
    const heatmapFile = req.files?.heatmap?.[0];

    if (!originalFile || !heatmapFile) {
      return res.status(400).json({ error: "Both 'original' and 'heatmap' files are required." });
    }

    // ---- Deterministic layer. Runs first, and independently of Gemini, so
    // ---- metrics and risk survive any failure of the narrative model.
    const metrics = computeHeatmapMetrics(heatmapFile.buffer);
    const risk = classifyTamperingRisk(metrics);

    if (!metrics || !risk) {
      return res.status(422).json({
        error: "metrics_failed",
        reason: "The heatmap image could not be read, so no forensic metrics could be derived.",
      });
    }

    // ---- Interpretation layer. Failures here must not lose the metrics.
    let narrative = null;
    let narrativeError = null;

    try {
      const interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        system_instruction: SYSTEM_INSTRUCTION,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: NARRATIVE_SCHEMA,
        },
        input: [
          { type: "text", text: buildEvidencePrompt(metrics, risk) },
          {
            type: "image",
            data: originalFile.buffer.toString("base64"),
            mime_type: originalFile.mimetype || "image/jpeg",
          },
          {
            type: "image",
            data: heatmapFile.buffer.toString("base64"),
            mime_type: heatmapFile.mimetype || "image/png",
          },
        ],
      });

      const raw = interaction.output_text?.trim();
      if (!raw) {
        narrativeError = "Gemini returned an empty response.";
      } else {
        try {
          const parsed = JSON.parse(raw);
          const missing = NARRATIVE_SCHEMA.required.filter((k) => typeof parsed[k] !== "string");
          if (missing.length > 0) {
            narrativeError = `Gemini response was missing expected fields: ${missing.join(", ")}.`;
          } else {
            narrative = parsed;
          }
        } catch {
          narrativeError = "Gemini returned a response that could not be parsed as JSON.";
        }
      }
    } catch (err) {
      const rawMessage = String(err?.message || err);
      // Log the message only, never the error object: the failed request
      // carries the user's document as base64, and dumping the whole error
      // risks writing that (or request context) into the logs.
      console.error("Gemini call failed:", rawMessage.slice(0, 300));

      if (err?.statusCode === 429 || rawMessage.includes("429")) {
        const retry = rawMessage.match(/retry in ([\d.]+)s/i)?.[1];
        narrativeError = `Gemini free-tier rate limit reached${
          retry ? ` — try again in about ${Math.ceil(Number(retry))}s` : " — try again shortly"
        }.`;
      } else if (err?.statusCode === 404 || rawMessage.includes("not found")) {
        narrativeError = `Model "${GEMINI_MODEL}" was not found or isn't available to this API key.`;
      } else if (err?.statusCode === 401 || err?.statusCode === 403) {
        narrativeError = "Gemini rejected the API key (check GEMINI_API_KEY in narrative-service/.env).";
      } else {
        narrativeError = `Gemini request failed: ${rawMessage.slice(0, 200)}`;
      }
    }

    // Metrics and risk are returned either way — the deterministic evidence
    // does not depend on the narrative model being available.
    res.json({ metrics, risk, narrative, narrativeError });
  },
);

app.listen(PORT, () => {
  console.log(`[narrative-service] listening on http://localhost:${PORT} (model: ${GEMINI_MODEL})`);
});
