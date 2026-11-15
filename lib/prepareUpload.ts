"use client";

import { fitWithin, isImageFile, UPLOAD_IMAGE_SIDE } from "./upload";

// Runs in the browser before a file goes to /api/extract. Photos straight from a phone can be larger than
// Claude accepts (over 8000 px on a side, or many MB), sideways (EXIF rotation) or HEIC. A photo is
// redrawn upright at most UPLOAD_IMAGE_SIDE px on the long side and sent as JPEG. PDFs pass through.
// Everything stays in memory; nothing is stored.

/** Small, upright JPEG/PNG/WebP photos are sent as they are. */
const KEEP_AS_IS_BYTES = 3 * 1024 * 1024;
const JPEG_QUALITY = 0.9;

export async function prepareUpload(file: File): Promise<File> {
  if (!isImageFile(file) || file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the EXIF rotation, so a portrait phone photo is sent upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // This browser can't decode it (e.g. HEIC outside Safari): send as is and let the server explain.
    return file;
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, UPLOAD_IMAGE_SIDE);
    const plain = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (plain && width === bitmap.width && height === bitmap.height && file.size <= KEEP_AS_IS_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // transparent PNG areas become white, not black
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    canvas.width = canvas.height = 0; // release the pixels
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
