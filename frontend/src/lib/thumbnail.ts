/**
 * Generates a small display-only thumbnail from an uploaded image.
 *
 * This is a DERIVED asset and is stored alongside — never instead of — the
 * original. The original upload is the forensic source and its bytes are
 * never recompressed, resized or converted, because CAT-Net's analysis
 * depends on the file's exact JPEG compression history.
 *
 * Runs on a canvas in the browser, so it needs no dependency and no server
 * round-trip. Returns null if the image can't be decoded, in which case the
 * caller simply skips the thumbnail rather than failing the analysis.
 */
const MAX_EDGE = 320;
const QUALITY = 0.8;

export async function generateThumbnail(file: File): Promise<Blob | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = objectUrl;
    });
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;

    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", QUALITY);
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
