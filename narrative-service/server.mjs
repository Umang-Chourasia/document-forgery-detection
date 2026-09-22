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
1. MEASURED EVIDENCE — deterministic measurements calculated from the
   analysis, plus a Tampering Risk level that has ALREADY been decided by a
   fixed rule over those measurements. You do not decide the risk level.
2. The ORIGINAL document image.
3. The ANALYSIS HEATMAP, where warm colours (red/orange) mark localized
   regions whose visual evidence is inconsistent with the rest of the
   document, and cool colours (blue) mark regions where no such
   inconsistency was found.

The analysis localizes regions of unusual evidence. It is not a forgery
detector and produces no authenticity score. The measurements describe the
detected evidence; they are not confidence values.

Write for a human reviewer who must reach their own conclusion.

Output format — this matters:
- Write in SHORT BULLET POINTS, not paragraphs.
- "what_the_analysis_shows": 2 to 4 points, each one short sentence,
  describing the detected evidence and where it appears. Measured facts only.
- "interpretation": 2 to 4 points, each one short sentence, on what that
  evidence could mean for a reviewer. No verdict.
- "confidence": 1 to 2 points on how much weight the evidence can carry and
  what would be needed to firm it up.
- Each point is a plain sentence of roughly 10 to 25 words. No markdown, no
  leading bullet characters, no numbering, no headings inside a point.

Rules:
- Never declare the document "fake", "forged", "authentic", "genuine", or
  give an overall verdict. Describe evidence; do not adjudicate.
- Never contradict or restate the supplied Tampering Risk as if you chose
  it. You may explain what the measurements behind it mean.
- Never invent numbers. Only refer to figures you were given.
- Never name or allude to the underlying model, architecture, service or
  implementation. Use neutral wording: the analysis, detected evidence,
  localized regions, measured intensity, image evidence.
- When the evidence supports it, you may name a POSSIBLE manipulation
  pattern (copy-move, splicing, text or region replacement, compositing, or
  uncertain), phrased as an estimate — "consistent with a possible splice",
  never "this is a splice". If the evidence does not support naming one, use
  "uncertain".
- If nothing meaningful is detected, say so plainly and do not speculate.`;

/**
 * Schema for the structured narrative, so the UI can render fields reliably.
 *
 * The three point-wise arrays replace the earlier prose fields
 * (observed_evidence / location_description / plain_language_meaning /
 * pattern_reasoning) as the primary output. Those fields are no longer
 * requested, but the UI still renders them when an analysis stored under the
 * old format is reopened, so history keeps working without a migration.
 */
const NARRATIVE_SCHEMA = {
  type: "object",
  properties: {
    what_the_analysis_shows: {
      type: "array",
      items: { type: "string" },
      description:
        "2-4 short points stating the detected evidence and where it appears. Measured facts only.",
    },
    interpretation: {
      type: "array",
      items: { type: "string" },
      description:
        "2-4 short points on what the evidence could mean for a reviewer. No verdict.",
    },
    confidence: {
      type: "array",
      items: { type: "string" },
      description:
        "1-2 short points on how much weight this evidence can carry and what would firm it up.",
    },
    possible_pattern: {
      type: "string",
      enum: ["copy-move", "splicing", "text-replacement", "compositing", "uncertain"],
    },
    pattern_confidence: { type: "string", enum: ["low", "medium", "high"] },
    caveats: { type: "string", description: "Limits of this interpretation, one sentence." },
  },
  required: [
    "what_the_analysis_shows",
    "interpretation",
    "confidence",
    "possible_pattern",
    "pattern_confidence",
    "caveats",
  ],
};

/** Field name -> expected shape, for validating the model's response. */
const NARRATIVE_ARRAY_FIELDS = [
  "what_the_analysis_shows",
  "interpretation",
  "confidence",
];

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.get("/", (_req, res) => {
  res.json({ status: "narrative service is running" });
});

function buildEvidencePrompt(metrics, risk) {
  return [
    "MEASURED EVIDENCE (deterministic, calculated from the detected evidence):",
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
        weighted_evidence_score: risk.score,
      },
      null,
      2,
    ),
    "",
    // Describes the rule the level actually came from. Kept in step with
    // RISK_RULES by interpolation rather than prose, so it cannot drift.
    "How the fixed rule decided that level: it computes a weighted score from " +
      `peak intensity (weight ${RISK_RULES.peakWeight}), the extent of the flagged ` +
      `area (weight ${RISK_RULES.extentWeight}) and the spatial coherence of that ` +
      `area (weight ${RISK_RULES.coherenceWeight}). Peak intensity ramps in from ` +
      `${RISK_RULES.peakFloor} and is maximal at ${RISK_RULES.peakSaturation}. ` +
      `A score of ${RISK_RULES.mediumScore} or more is at least MEDIUM. HIGH needs a ` +
      `score of ${RISK_RULES.highScore} or more AND at least ` +
      `${RISK_RULES.highMinArea * 100}% of the image flagged AND a single region of at ` +
      `least ${RISK_RULES.highMinRegion * 100}% of the image, so peak intensity alone ` +
      "can never produce HIGH.",
    "",
    "The score is an internal weighting of the measurements above. It is not a " +
      "probability, not a confidence value, and not an output of the analysis " +
      "itself. Never mention the score, the weights or the thresholds in your " +
      "response — they are internal to the application.",
    "",
    "Explain this evidence for the reviewer, in short bullet points, using the " +
      "required fields. The risk level is already decided; do not re-decide it.",
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
        narrativeError = "The interpretation service returned an empty response.";
      } else {
        try {
          const parsed = JSON.parse(raw);
          const missing = NARRATIVE_SCHEMA.required.filter((k) => {
            const value = parsed[k];
            return NARRATIVE_ARRAY_FIELDS.includes(k)
              ? !Array.isArray(value) ||
                  value.length === 0 ||
                  !value.every((item) => typeof item === "string" && item.trim())
              : typeof value !== "string" || !value.trim();
          });
          if (missing.length > 0) {
            narrativeError = `The interpretation was incomplete (missing: ${missing.join(", ")}).`;
          } else {
            narrative = parsed;
          }
        } catch {
          narrativeError = "The interpretation service returned a response that could not be read.";
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
        narrativeError = `The interpretation service is rate limited${
          retry ? ` — try again in about ${Math.ceil(Number(retry))}s` : " — try again shortly"
        }.`;
      } else if (err?.statusCode === 404 || rawMessage.includes("not found")) {
        narrativeError = "The configured interpretation model is unavailable to this deployment.";
      } else if (err?.statusCode === 401 || err?.statusCode === 403) {
        narrativeError = "The interpretation service rejected this deployment's credentials.";
      } else {
        narrativeError = "The interpretation service could not complete this request.";
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
