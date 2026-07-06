/**
 * Client-side image resizing via <canvas>, replacing the old server-side
 * `sharp` pipeline. Runs entirely in the browser — nothing is uploaded.
 */

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = dataUrl;
  });
}

function resizeToDataUrl(
  img: HTMLImageElement,
  maxSize: number,
  quality: number,
  cover = false,
): string {
  const { width, height } = img;
  let targetW: number, targetH: number;

  if (cover) {
    // Crop to a square, filling maxSize x maxSize (used for thumbnails).
    targetW = maxSize;
    targetH = maxSize;
  } else {
    const scale = Math.min(1, maxSize / Math.max(width, height));
    targetW = Math.round(width * scale);
    targetH = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  if (cover) {
    const scale = Math.max(targetW / width, targetH / height);
    const drawW = width * scale;
    const drawH = height * scale;
    const dx = (targetW - drawW) / 2;
    const dy = (targetH - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    ctx.drawImage(img, 0, 0, targetW, targetH);
  }

  return canvas.toDataURL("image/webp", quality);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

/** Produces a resized "full" image (max 1600px) and a square thumbnail (360px), both as webp data URLs. */
export async function prepareImageForAnalysis(
  file: File,
): Promise<{ photoDataUrl: string; thumbnailDataUrl: string }> {
  const original = await fileToDataUrl(file);
  const img = await loadImage(original);
  const photoDataUrl = resizeToDataUrl(img, 1600, 0.82);
  const thumbnailDataUrl = resizeToDataUrl(img, 360, 0.72, true);
  return { photoDataUrl, thumbnailDataUrl };
}

/** Strips the "data:image/webp;base64," prefix, returning raw base64 + mime type for Gemini's inlineData input. */
export function dataUrlToInlineData(dataUrl: string): { data: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL.");
  return { mimeType: match[1], data: match[2] };
}
