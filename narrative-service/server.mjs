import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const PORT = process.env.PORT || 4000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set. Create a .env file (see .env.example).");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are assisting a forensic document reviewer.
You are given two images: the ORIGINAL document/photo, and a HEATMAP produced
by CAT-Net, a compression-artifact-based forgery localization model. In the
heatmap, warm colors (red/orange) mark regions where the JPEG compression
history is locally inconsistent with the rest of the image — potential
evidence of editing. Cool colors (blue) mean no such inconsistency was found.

Describe, in 3-5 plain-language sentences, what the heatmap shows: whether
any regions are highlighted, roughly where they are in the image (e.g.
"the upper-right corner", "an object in the center-left"), and what that
pattern is consistent with.

Do NOT declare the document "fake", "forged", "authentic", "real", or give
any overall verdict. You are describing localized evidence for a human
reviewer to interpret themselves, not making the determination for them.
If nothing is highlighted, say so plainly.`;

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.get("/", (_req, res) => {
  res.json({ status: "narrative service is running" });
});

app.post(
  "/api/narrate",
  upload.fields([{ name: "original", maxCount: 1 }, { name: "heatmap", maxCount: 1 }]),
  async (req, res) => {
    const originalFile = req.files?.original?.[0];
    const heatmapFile = req.files?.heatmap?.[0];

    if (!originalFile || !heatmapFile) {
      return res.status(400).json({ error: "Both 'original' and 'heatmap' files are required." });
    }

    try {
      const interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        system_instruction: SYSTEM_INSTRUCTION,
        input: [
          { type: "text", text: "Describe what this CAT-Net heatmap shows for this document." },
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

      const summary = interaction.output_text?.trim();
      if (!summary) {
        return res.status(502).json({ error: "empty", reason: "Gemini returned an empty response." });
      }

      res.json({ summary });
    } catch (err) {
      const raw = String(err?.message || err);
      console.error("Gemini call failed:", err);

      let reason = `Gemini request failed: ${raw.slice(0, 200)}`;
      let status = 502;
      if (err?.statusCode === 429 || raw.includes("429")) {
        status = 429;
        const retry = raw.match(/retry in ([\d.]+)s/i)?.[1];
        reason = `Gemini free-tier rate limit reached${
          retry ? ` — try again in about ${Math.ceil(Number(retry))}s` : " — try again shortly"
        }.`;
      } else if (err?.statusCode === 404 || raw.includes("not found")) {
        reason = `Model "${GEMINI_MODEL}" was not found or isn't available to this API key.`;
      } else if (err?.statusCode === 401 || err?.statusCode === 403) {
        reason = "Gemini rejected the API key (check GEMINI_API_KEY in narrative-service/.env).";
      }

      res.status(status).json({ error: "gemini_failed", reason });
    }
  },
);

app.listen(PORT, () => {
  console.log(`[narrative-service] listening on http://localhost:${PORT} (model: ${GEMINI_MODEL})`);
});
