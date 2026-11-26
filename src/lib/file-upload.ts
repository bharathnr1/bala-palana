import { fitWithin, IMAGE_LONG_EDGE, IMAGE_TARGET_BYTES } from "./images";

/** PDFs are capped at 5 MB (D16). */
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** Start at a quality that looks good on a phone, then step down until small enough. */
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.42] as const;

const JPEG_MIME = "image/jpeg";

/** Does this file fit the PDF limit? Used before offering an upload. */
export function isPdfWithinLimit(sizeBytes: number, maxBytes: number = MAX_PDF_BYTES): boolean {
  return Number.isFinite(sizeBytes) && sizeBytes > 0 && sizeBytes <= maxBytes;
}

/**
 * Upload straight to Supabase Storage through a signed URL (D16), so the
 * file never passes through the app server.
 */
export async function uploadFile(
  signedUrl: string,
  file: Blob,
  contentType: string = file.type || "application/octet-stream",
): Promise<void> {
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": contentType, "x-upsert": "true" },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The image could not be encoded"))),
      JPEG_MIME,
      quality,
    );
  });
}

/**
 * Compress a photo on the phone to about 200 KB before upload (D16): scale the
 * long edge to 1600 px, then lower the JPEG quality and, if needed, scale down
 * further until it fits. Non-images (such as PDFs) pass through unchanged.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = fitWithin(bitmap.width, bitmap.height, IMAGE_LONG_EDGE);
    let smallest: Blob | null = null;

    // Two passes: one at the target size, one at 80% of it.
    for (let pass = 0; pass < 2; pass += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available in this browser");
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await toJpeg(canvas, quality);
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= IMAGE_TARGET_BYTES) return blob;
      }

      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }

    if (!smallest) throw new Error("The image could not be compressed");
    return smallest;
  } finally {
    bitmap.close();
  }
}
