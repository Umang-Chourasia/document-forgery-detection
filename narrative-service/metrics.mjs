/**
 * Deterministic forensic metrics derived from a CAT-Net heatmap.
 *
 * WHAT THIS IS
 * ------------
 * CAT-Net's HTTP API returns only a *rendered* heatmap PNG — the raw
 * per-pixel probability array is discarded inside the model's own
 * inference script before the image is written. Everything here is
 * therefore measured from that rendered image by inverting the colormap.
 *
 * These are measurements of the heatmap, NOT direct CAT-Net outputs, and
 * NOT a model confidence or probability. Nothing here is an opinion about
 * whether a document was forged; that interpretation is left to a human
 * reviewer, assisted by the narrative layer.
 *
 * ACCURACY AND ITS LIMITS
 * -----------------------
 * The renderer draws the probability map with matplotlib's `jet` colormap
 * at vmin=0, vmax=1, so a pixel's colour maps back to its intensity.
 * Inverting it was measured against real CAT-Net output at 100% of pixels
 * within 0.02 absolute error (mean 0.0019).
 *
 * Two caveats, deliberately recorded rather than hidden:
 *   1. matplotlib resamples when rendering (a ~320x240 probability map is
 *      written as a ~581x431 image), so areas are faithful proportions of
 *      the image but are not exact original-pixel counts.
 *   2. Antialiasing at region edges introduces a thin band of intermediate
 *      intensities that does not exist in the model's own output.
 * Both affect edges, not the presence or rough extent of evidence.
 */
import { PNG } from "pngjs";

/**
 * matplotlib's `jet`, defined exactly as matplotlib does: piecewise-linear
 * interpolation between these anchor points. Verified against
 * matplotlib.cm.jet at 256 samples with 0.000000 maximum channel error, so
 * this is the real colormap rather than the common approximation (which is
 * off by up to 33/255 and would distort every measurement below).
 */
const JET_SEGMENTS = {
  r: [[0.0, 0.0], [0.35, 0.0], [0.66, 1.0], [0.89, 1.0], [1.0, 0.5]],
  g: [[0.0, 0.0], [0.125, 0.0], [0.375, 1.0], [0.64, 1.0], [0.91, 0.0], [1.0, 0.0]],
  b: [[0.0, 0.5], [0.11, 1.0], [0.34, 1.0], [0.65, 0.0], [1.0, 0.0]],
};

const LUT_SIZE = 256;

function interpolateSegment(anchors, t) {
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1];
    const [x1, y1] = anchors[i];
    if (t <= x1) {
      if (x1 === x0) return y1;
      return y0 + ((y1 - y0) * (t - x0)) / (x1 - x0);
    }
  }
  return anchors[anchors.length - 1][1];
}

/** 256-entry jet lookup table as 0-255 RGB, built once at module load. */
const JET_LUT = (() => {
  const lut = new Float64Array(LUT_SIZE * 3);
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    lut[i * 3] = interpolateSegment(JET_SEGMENTS.r, t) * 255;
    lut[i * 3 + 1] = interpolateSegment(JET_SEGMENTS.g, t) * 255;
    lut[i * 3 + 2] = interpolateSegment(JET_SEGMENTS.b, t) * 255;
  }
  return lut;
})();

/**
 * Maps one RGB colour back to the intensity that produced it, by nearest
 * neighbour against the jet LUT. Results are memoised per colour: a
 * rendered heatmap contains only a few hundred distinct colours, so this
 * turns a 250k-pixel scan into a few hundred searches plus cheap lookups.
 */
function makeIntensityResolver() {
  const cache = new Map();
  return (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;

    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < LUT_SIZE; i++) {
      const dr = r - JET_LUT[i * 3];
      const dg = g - JET_LUT[i * 3 + 1];
      const db = b - JET_LUT[i * 3 + 2];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    const intensity = bestIndex / (LUT_SIZE - 1);
    cache.set(key, intensity);
    return intensity;
  };
}

/** A pixel counts as evidence at or above this intensity. */
export const EVIDENCE_THRESHOLD = 0.5;
/** Regions smaller than this fraction of the image are treated as speckle. */
const MIN_REGION_FRACTION = 0.0002;

/**
 * Labels connected evidence regions with 8-connectivity, iteratively (an
 * explicit stack, because recursion would overflow on a large contiguous
 * region). Returns region areas in pixels, largest first.
 */
function connectedRegionAreas(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const areas = [];
  const stack = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;

    let area = 0;
    stack.push(start);
    visited[start] = 1;

    while (stack.length > 0) {
      const index = stack.pop();
      area++;
      const x = index % width;
      const y = (index - x) / width;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighbour = ny * width + nx;
          if (mask[neighbour] && !visited[neighbour]) {
            visited[neighbour] = 1;
            stack.push(neighbour);
          }
        }
      }
    }
    areas.push(area);
  }

  return areas.sort((a, b) => b - a);
}

function round(value, places = 6) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Computes forensic metrics from a rendered CAT-Net heatmap PNG.
 * Returns null if the image cannot be decoded — callers treat that as
 * "metrics unavailable" rather than as an absence of evidence.
 */
export function computeHeatmapMetrics(pngBuffer) {
  let png;
  try {
    png = PNG.sync.read(pngBuffer);
  } catch {
    return null;
  }

  const { width, height, data } = png;
  const pixelCount = width * height;
  if (!pixelCount) return null;

  const resolve = makeIntensityResolver();
  const mask = new Uint8Array(pixelCount);

  // Histogram over ten fixed 0.1-wide intensity bands.
  const histogram = new Array(10).fill(0);

  let intensitySum = 0;
  let evidenceIntensitySum = 0;
  let evidenceCount = 0;
  let maxIntensity = 0;

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    // Fully transparent pixels carry no colour information. Real CAT-Net
    // output is fully opaque, but padding would otherwise read as intensity 0
    // and dilute every average.
    if (data[offset + 3] === 0) continue;

    const intensity = resolve(data[offset], data[offset + 1], data[offset + 2]);

    intensitySum += intensity;
    if (intensity > maxIntensity) maxIntensity = intensity;

    const bucket = Math.min(9, Math.floor(intensity * 10));
    histogram[bucket]++;

    if (intensity >= EVIDENCE_THRESHOLD) {
      mask[i] = 1;
      evidenceCount++;
      evidenceIntensitySum += intensity;
    }
  }

  const evidenceAreaFraction = evidenceCount / pixelCount;
  const regionAreas = evidenceCount > 0 ? connectedRegionAreas(mask, width, height) : [];
  const significantRegions = regionAreas.filter((a) => a / pixelCount >= MIN_REGION_FRACTION);
  const largestRegionArea = regionAreas.length > 0 ? regionAreas[0] : 0;

  return {
    // Source and method, so a reader can see where these numbers came from.
    source: "derived_from_rendered_heatmap",
    heatmapWidth: width,
    heatmapHeight: height,
    evidenceThreshold: EVIDENCE_THRESHOLD,

    // Area
    evidenceAreaFraction: round(evidenceAreaFraction),
    evidencePixelCount: evidenceCount,

    // Intensity
    maxIntensity: round(maxIntensity),
    meanIntensity: round(intensitySum / pixelCount),
    meanEvidenceIntensity: evidenceCount > 0 ? round(evidenceIntensitySum / evidenceCount) : 0,
    intensityHistogram: histogram,

    // Spatial structure
    regionCount: significantRegions.length,
    largestRegionFraction: round(largestRegionArea / pixelCount),
    // Of everything flagged, how much sits in the single biggest region.
    // Near 1 means one coherent area; near 0 means scattered speckle.
    largestRegionShare: evidenceCount > 0 ? round(largestRegionArea / evidenceCount) : 0,
  };
}

/**
 * Deterministic tampering-risk classification.
 *
 * This is a fixed rule over the measured metrics — the same heatmap always
 * yields the same level, and no language model is involved in choosing it.
 *
 * The rule is a weighted score over three normalised sub-scores, banded into
 * LOW / MEDIUM / HIGH, with two hard gates.
 *
 * Why it is shaped this way. The previous rule used peak intensity only as an
 * on/off gate at 0.5, so a peak of 0.51 and a peak of 1.00 were treated
 * identically and peak strength carried no weight at all above the gate. Peak
 * intensity is now the dominant term, while extent and spatial structure
 * remain genuinely decisive — a strong peak with no spatial support is not
 * evidence of anything.
 *
 * Two properties are deliberate and load-bearing:
 *
 *   1. PEAK_WEIGHT (0.55) is strictly less than HIGH_SCORE (0.62). A perfect
 *      1.0 peak with no area and no coherence scores 0.55, so peak intensity
 *      ALONE can never reach HIGH. This is the arithmetic guarantee that a
 *      single hot pixel cannot drive the classification.
 *   2. HIGH additionally requires real measured area and a real coherent
 *      region (the G2 gate below), independently of the score.
 *
 * Area and region use a logarithmic ramp because they span three orders of
 * magnitude; a linear ramp would make everything below ~1% indistinguishable
 * from zero.
 *
 * Sub-threshold note: every spatial metric is derived from the mask at
 * EVIDENCE_THRESHOLD, so when nothing reaches that threshold they are all
 * structurally zero. The elevated-area term reads the existing intensity
 * histogram so that heatmaps peaking below the threshold are still graded
 * rather than collapsing to a flat zero. It carries half credit, because it
 * measures a weaker signal than the primary mask does.
 */
export const RISK_RULES = {
  // --- Weights. Must sum to 1, and PEAK must stay below highScore. ---
  peakWeight: 0.55,
  extentWeight: 0.25,
  coherenceWeight: 0.2,

  // --- Peak intensity ramp ---
  /** At or below this peak, the heatmap shows nothing worth reporting. */
  peakFloor: 0.2,
  /** Peak contribution is maximal at and above this. */
  peakSaturation: 0.95,

  // --- Extent ramps ---
  /** Flagged area below this is treated as noise. */
  evidenceFloor: 0.0005, // 0.05% of the image
  /** Extent contribution is maximal at and above this. */
  areaSaturation: 0.05, // 5%
  /** Elevated (sub-threshold) area below this is treated as noise. */
  elevatedFloor: 0.005, // 0.5% of the image at or above ELEVATED_INTENSITY
  /** Elevated-area contribution is maximal at and above this. */
  elevatedSaturation: 0.2, // 20%

  // --- Coherence ramp ---
  /** Largest coherent region below this contributes nothing. */
  regionFloor: 0.0005, // 0.05%
  /** Coherence contribution is maximal at and above this. */
  regionSaturation: 0.02, // 2%

  // --- Bands ---
  /** Score at or above this is at least MEDIUM. */
  mediumScore: 0.3,
  /** Score at or above this is HIGH, if the spatial gate also passes. */
  highScore: 0.62,

  // --- HIGH spatial gate (G2): required regardless of score ---
  /** HIGH needs at least this much of the image flagged... */
  highMinArea: 0.005, // 0.5%
  /** ...and at least this much of it in one coherent region. */
  highMinRegion: 0.002, // 0.2%
};

/**
 * Intensity at or above which a pixel counts towards the elevated-area term.
 * Lower than EVIDENCE_THRESHOLD on purpose: this is the sub-threshold signal.
 * Must align with a histogram band boundary — band index 3 of 10 starts here.
 */
export const ELEVATED_INTENSITY = 0.3;
const ELEVATED_FIRST_BAND = 3;

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Linear ramp from `floor` to `saturation`, clamped to [0, 1]. */
function linearRamp(value, floor, saturation) {
  if (!Number.isFinite(value) || saturation <= floor) return 0;
  return clamp01((value - floor) / (saturation - floor));
}

/**
 * Logarithmic ramp, clamped to [0, 1]. `floor` sets the knee: values well
 * below it score near zero, and the curve reaches 1 at `saturation`.
 */
function logRamp(value, floor, saturation) {
  if (!Number.isFinite(value) || value <= 0 || floor <= 0 || saturation <= floor) {
    return 0;
  }
  return clamp01(Math.log1p(value / floor) / Math.log1p(saturation / floor));
}

/**
 * Fraction of measured pixels at or above ELEVATED_INTENSITY, read from the
 * histogram the metrics payload already carries. Returns 0 when the histogram
 * is missing or empty, so an older stored payload degrades to "no
 * sub-threshold signal" rather than to NaN.
 */
function elevatedAreaFraction(histogram) {
  if (!Array.isArray(histogram) || histogram.length === 0) return 0;

  let total = 0;
  let elevated = 0;
  for (let i = 0; i < histogram.length; i++) {
    const count = Number(histogram[i]);
    if (!Number.isFinite(count)) continue;
    total += count;
    if (i >= ELEVATED_FIRST_BAND) elevated += count;
  }

  return total > 0 ? elevated / total : 0;
}

/**
 * Scores a metrics payload without banding it. Separated so the score and its
 * components can be asserted directly in tests and reported in `inputs`.
 */
export function scoreTamperingEvidence(metrics) {
  const maxIntensity = Number(metrics.maxIntensity) || 0;
  const evidenceAreaFraction = Number(metrics.evidenceAreaFraction) || 0;
  const largestRegionFraction = Number(metrics.largestRegionFraction) || 0;
  const largestRegionShare = Number(metrics.largestRegionShare) || 0;
  const elevatedArea = elevatedAreaFraction(metrics.intensityHistogram);

  // Peak intensity — the dominant term.
  const peakScore = linearRamp(
    maxIntensity,
    RISK_RULES.peakFloor,
    RISK_RULES.peakSaturation,
  );

  // Extent. The primary measure is the flagged area at EVIDENCE_THRESHOLD;
  // the elevated area stands in at half credit when that mask is empty.
  const areaScore = logRamp(
    evidenceAreaFraction,
    RISK_RULES.evidenceFloor,
    RISK_RULES.areaSaturation,
  );
  const elevatedScore = logRamp(
    elevatedArea,
    RISK_RULES.elevatedFloor,
    RISK_RULES.elevatedSaturation,
  );
  const extentScore = Math.max(areaScore, 0.5 * elevatedScore);

  // Spatial coherence, discounted when the flagged area is fragmented:
  // largestRegionShare near 1 is one coherent region, near 0 is speckle.
  const regionScore = logRamp(
    largestRegionFraction,
    RISK_RULES.regionFloor,
    RISK_RULES.regionSaturation,
  );
  const coherenceScore = regionScore * (0.5 + 0.5 * clamp01(largestRegionShare));

  const score =
    RISK_RULES.peakWeight * peakScore +
    RISK_RULES.extentWeight * extentScore +
    RISK_RULES.coherenceWeight * coherenceScore;

  return {
    score: round(clamp01(score)),
    peakScore: round(peakScore),
    extentScore: round(extentScore),
    coherenceScore: round(coherenceScore),
    elevatedArea: round(elevatedArea),
    maxIntensity,
    evidenceAreaFraction,
    largestRegionFraction,
    largestRegionShare,
  };
}

export function classifyTamperingRisk(metrics) {
  if (!metrics) return null;

  const s = scoreTamperingEvidence(metrics);
  const {
    score,
    maxIntensity,
    evidenceAreaFraction,
    largestRegionFraction,
    largestRegionShare,
    elevatedArea,
  } = s;
  const regionCount = Number(metrics.regionCount) || 0;

  const pct = (v, places = 2) => `${(v * 100).toFixed(places)}%`;

  // --- G1: nothing worth reporting. ---
  const belowPeakFloor = maxIntensity < RISK_RULES.peakFloor;
  const belowAreaFloor =
    evidenceAreaFraction < RISK_RULES.evidenceFloor &&
    elevatedArea < RISK_RULES.elevatedFloor;

  if (belowPeakFloor || belowAreaFloor) {
    return {
      level: "LOW",
      rule: "below_evidence_floor",
      rationale:
        `Peak measured intensity reaches ${maxIntensity.toFixed(2)} and detected evidence ` +
        `covers ${pct(evidenceAreaFraction)} of the document. That falls below the level at ` +
        `which evidence is reported. No meaningful localized evidence.`,
      score,
      inputs: {
        score,
        maxIntensity,
        evidenceAreaFraction,
        elevatedArea,
      },
    };
  }

  const inputs = {
    score,
    maxIntensity,
    evidenceAreaFraction,
    largestRegionFraction,
    largestRegionShare,
    regionCount,
    elevatedArea,
  };

  // Measurements only. The weighted score and the rule constants are
  // deliberately absent: they are internal to the rule, and the reviewer-facing
  // rationale should describe the evidence, not the machinery.
  const basis =
    `Peak measured intensity ${maxIntensity.toFixed(2)}, with detected evidence over ` +
    `${pct(evidenceAreaFraction)} of the document across ${regionCount} region(s), ` +
    `the largest holding ${pct(largestRegionShare, 0)} of the detected evidence ` +
    `(${pct(largestRegionFraction)} of the document).`;

  // --- G2: HIGH needs the score AND real spatial support. ---
  const meetsHighScore = score >= RISK_RULES.highScore;
  const meetsHighArea = evidenceAreaFraction >= RISK_RULES.highMinArea;
  const meetsHighRegion = largestRegionFraction >= RISK_RULES.highMinRegion;

  if (meetsHighScore && meetsHighArea && meetsHighRegion) {
    return {
      level: "HIGH",
      rule: "substantial_coherent_region",
      rationale:
        `${basis} The evidence is strong in intensity, extensive across the ` +
        `document, and concentrated into a coherent region rather than scattered. ` +
        `Strong, spatially coherent evidence.`,
      score,
      inputs,
    };
  }

  if (score >= RISK_RULES.mediumScore) {
    // Name the reason HIGH was not reached, so the level is explainable.
    const rule = !meetsHighScore
      ? evidenceAreaFraction < RISK_RULES.highMinArea
        ? "limited_extent"
        : "fragmented_distribution"
      : !meetsHighArea
        ? "limited_extent"
        : "fragmented_distribution";

    return {
      level: "MEDIUM",
      rule,
      rationale:
        `${basis} Taken together that is short of strong evidence. ` +
        (rule === "limited_extent"
          ? `Present but limited in extent.`
          : `Present but fragmented rather than forming one coherent region.`),
      score,
      inputs,
    };
  }

  return {
    level: "LOW",
    rule: "weak_evidence",
    rationale:
      `${basis} Any detected regions are too faint, too small or too scattered to ` +
      `constitute meaningful localized evidence.`,
    score,
    inputs,
  };
}
