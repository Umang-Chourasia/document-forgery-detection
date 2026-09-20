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
 * Why the rules are shaped this way: real CAT-Net output is strongly
 * bimodal. Measured on genuine output, 6.07% of pixels were at or above
 * intensity 0.3 while 5.44% were at or above 0.9 — barely anything sits in
 * between. Banding by intensity alone would therefore collapse to LOW or
 * HIGH and essentially never produce MEDIUM, so extent and spatial
 * structure carry the distinction instead:
 *
 *   LOW    nothing meaningful flagged
 *   MEDIUM flagged, but either small in extent or fragmented into speckle
 *          rather than forming a coherent region
 *   HIGH   a substantial, coherent flagged area
 */
export const RISK_RULES = {
  /** Below this, the heatmap is treated as showing no real evidence. */
  minEvidenceAreaFraction: 0.001, // 0.1% of the image
  /** Nothing reaches this intensity => no evidence worth reporting. */
  minMaxIntensity: 0.5,
  /** HIGH needs at least this much of the image flagged... */
  highEvidenceAreaFraction: 0.02, // 2%
  /** ...and at least this much of it in one coherent region. */
  highLargestRegionFraction: 0.005, // 0.5%
};

export function classifyTamperingRisk(metrics) {
  if (!metrics) return null;

  const {
    evidenceAreaFraction,
    maxIntensity,
    largestRegionFraction,
    regionCount,
    largestRegionShare,
  } = metrics;

  if (
    maxIntensity < RISK_RULES.minMaxIntensity ||
    evidenceAreaFraction < RISK_RULES.minEvidenceAreaFraction
  ) {
    return {
      level: "LOW",
      rule: "below_evidence_floor",
      rationale:
        `Localized evidence covers ${(evidenceAreaFraction * 100).toFixed(2)}% of the heatmap ` +
        `with a peak intensity of ${maxIntensity.toFixed(2)}, below the reporting floor of ` +
        `${(RISK_RULES.minEvidenceAreaFraction * 100).toFixed(2)}% area and ` +
        `${RISK_RULES.minMaxIntensity} intensity. No meaningful localized evidence.`,
      inputs: { evidenceAreaFraction, maxIntensity },
    };
  }

  if (
    evidenceAreaFraction >= RISK_RULES.highEvidenceAreaFraction &&
    largestRegionFraction >= RISK_RULES.highLargestRegionFraction
  ) {
    return {
      level: "HIGH",
      rule: "substantial_coherent_region",
      rationale:
        `Localized evidence covers ${(evidenceAreaFraction * 100).toFixed(2)}% of the heatmap ` +
        `(threshold ${(RISK_RULES.highEvidenceAreaFraction * 100).toFixed(0)}%), and its largest ` +
        `single region alone covers ${(largestRegionFraction * 100).toFixed(2)}% ` +
        `(threshold ${(RISK_RULES.highLargestRegionFraction * 100).toFixed(1)}%). ` +
        `Substantial, spatially coherent evidence.`,
      inputs: { evidenceAreaFraction, largestRegionFraction, regionCount },
    };
  }

  return {
    level: "MEDIUM",
    rule:
      evidenceAreaFraction < RISK_RULES.highEvidenceAreaFraction
        ? "limited_extent"
        : "fragmented_distribution",
    rationale:
      `Localized evidence covers ${(evidenceAreaFraction * 100).toFixed(2)}% of the heatmap ` +
      `across ${regionCount} region(s), with the largest holding ` +
      `${(largestRegionShare * 100).toFixed(0)}% of the flagged area ` +
      `(${(largestRegionFraction * 100).toFixed(2)}% of the image). ` +
      (evidenceAreaFraction < RISK_RULES.highEvidenceAreaFraction
        ? `Present but limited in extent.`
        : `Widespread but fragmented rather than forming one coherent region.`),
    inputs: { evidenceAreaFraction, largestRegionFraction, regionCount, largestRegionShare },
  };
}
