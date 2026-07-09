/**
 * Client-side image downscaling before base64 encoding.
 *
 * Captured images are stored as base64 data-URLs (knowledge_items.image_url)
 * and rendered directly in grids — full-resolution phone photos and 4K
 * screenshots would otherwise bloat both the DB rows and the rendered <img>
 * payloads. This caps the long edge and re-encodes large PNGs as JPEG, while
 * leaving small/already-reasonable images untouched (no needless quality loss).
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// Small PNGs are almost always UI/analytics screenshots — keep them lossless.
const PNG_KEEP_THRESHOLD_BYTES = 800 * 1024;
// Small photos (jpeg/webp) below this are already reasonably sized — skip re-encoding.
const SKIP_THRESHOLD_BYTES = 400 * 1024;

export type EncodedImage = { base64: string; mediaType: string };

/** Read a File as a base64 data-URL, split into media type + base64 payload. */
function readAsDataUrl(file: File): Promise<EncodedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        base64: result.split(",")[1] ?? "",
        mediaType: file.type || "image/png",
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Load a File into a decoded ImageBitmap, falling back to an <img> element. */
async function loadBitmapLike(
  file: File,
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        close: () => bitmap.close(),
      };
    } catch {
      // fall through to <img> fallback below
    }
  }

  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    close: () => URL.revokeObjectURL(url),
  };
}

/**
 * Downscale + re-encode an image file for storage.
 * - Caps the long edge at 1600px.
 * - Keeps small PNG screenshots lossless.
 * - Re-encodes photos (and oversized PNGs) as JPEG q0.85.
 * - Skips the canvas round-trip entirely for already-small, already-small-dimension images.
 */
export async function downscaleImage(file: File): Promise<EncodedImage> {
  const isPng = file.type === "image/png";
  const skipThreshold = isPng ? PNG_KEEP_THRESHOLD_BYTES : SKIP_THRESHOLD_BYTES;

  if (file.size <= skipThreshold) {
    // Still need dimensions to make sure a small file isn't secretly huge
    // (e.g. a highly-compressed 4000px screenshot).
    const probe = await loadBitmapLike(file);
    const withinDimensions = Math.max(probe.width, probe.height) <= MAX_DIMENSION;
    probe.close();
    if (withinDimensions) {
      return readAsDataUrl(file);
    }
  }

  const source = await loadBitmapLike(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
    const targetWidth = Math.max(1, Math.round(source.width * scale));
    const targetHeight = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return readAsDataUrl(file);

    source.draw(ctx, targetWidth, targetHeight);

    const useJpeg = !isPng || file.size > PNG_KEEP_THRESHOLD_BYTES;
    const mediaType = useJpeg ? "image/jpeg" : "image/png";
    const dataUrl = canvas.toDataURL(mediaType, useJpeg ? JPEG_QUALITY : undefined);
    return { base64: dataUrl.split(",")[1] ?? "", mediaType };
  } finally {
    source.close();
  }
}
