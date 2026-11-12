/**
 * Browser-side downscale before a media upload.
 *
 * The production host rejects request bodies above ~4.5 MB, and Next's Server
 * Actions default to 1 MB. Phone photos routinely exceed both. Shrinking them
 * to WebP in the browser keeps uploads small; the server still re-encodes and
 * caps the final image at 1600px.
 */
const MAX_EDGE = 1600;
const COMPRESS_ABOVE = 900 * 1024;
const MAX_UPLOAD = 4 * 1024 * 1024;

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });

const loadBitmap = async (file: File) => {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(file);
  }
};

export async function prepareImageForUpload(file: File): Promise<File> {
  // Animated GIFs lose their frames on a canvas — keep them untouched.
  if (file.type === "image/gif") {
    if (file.size > MAX_UPLOAD) throw new Error("file_too_large");
    return file;
  }

  if (file.size <= COMPRESS_ABOVE) return file;
  if (typeof document === "undefined") return file;

  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    let blob = await canvasToBlob(canvas, "image/webp", 0.85);
    // Older Safari cannot encode WebP from a canvas — JPEG is universal.
    if (!blob || blob.type !== "image/webp") {
      blob = (await canvasToBlob(canvas, "image/jpeg", 0.85)) ?? blob;
    }
    if (blob && blob.size > 1.5 * 1024 * 1024) {
      const retry = await canvasToBlob(
        canvas,
        blob.type === "image/jpeg" ? "image/jpeg" : "image/webp",
        0.7,
      );
      if (retry && retry.size < blob.size) blob = retry;
    }

    // Keep whichever is smaller — a small PNG can beat a re-encode.
    const best = blob && blob.size < file.size ? blob : file;
    if (best.size > MAX_UPLOAD) throw new Error("file_too_large");
    if (best === file) return file;

    const ext =
      best.type === "image/webp" ? ".webp" : best.type === "image/jpeg" ? ".jpg" : ".png";
    return new File([best], file.name.replace(/\.[^.]+$/, "") + ext, {
      type: best.type,
      lastModified: file.lastModified,
    });
  } catch (error) {
    if ((error as Error).message === "file_too_large") throw error;
    if (file.size > MAX_UPLOAD) throw new Error("file_too_large");
    return file;
  }
}
