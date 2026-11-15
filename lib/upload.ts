// Upload limits shared by the browser (checked before sending) and /api/extract (enforced).

/** Claude takes images up to 10 MB base64-encoded (about 7.5 MB raw); PDFs up to the request limit. */
export const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 7 * 1024 * 1024;
/** Pay stubs and W-2s are one or two pages; longer PDFs are rejected before calling Claude. */
export const PDF_MAX_PAGES = 5;
/** Claude rejects images with a side over 8000 px; phone cameras at full resolution go past it. */
export const IMAGE_MAX_SIDE = 8000;
/** The browser shrinks photos to this long side before upload: small print stays legible, uploads stay small. */
export const UPLOAD_IMAGE_SIDE = 2400;
/** A photo picked in the browser may be this large before it is shrunk (e.g. a 200 MP phone photo). */
export const RAW_IMAGE_MAX_BYTES = 50 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
/** iPhone photos. Some browsers (Safari) can decode them, so they are converted to JPEG before upload. */
const HEIC_TYPES = ["image/heic", "image/heif"];
const HEIC_EXT = /\.(heic|heif)$/i;

export const isHeic = (file: { name: string; type: string }) => HEIC_TYPES.includes(file.type) || HEIC_EXT.test(file.name);
export const isImageFile = (file: { name: string; type: string }) =>
  IMAGE_TYPES.includes(file.type) || (!file.type && IMAGE_EXT.test(file.name)) || isHeic(file);

/**
 * Error code for a file that would be rejected, or null if it may be sent. Uses the declared type
 * and extension only; the server still checks the real bytes.
 */
export function uploadProblem(file: { name: string; type: string; size: number }, opts: { beforeResize?: boolean } = {}): string | null {
  if (file.size === 0) return "bad_size";
  const isPdf = file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name));
  const heic = isHeic(file);
  const isImage = IMAGE_TYPES.includes(file.type) || (!file.type && IMAGE_EXT.test(file.name)) || (opts.beforeResize && heic);
  if (!isPdf && !isImage) return "bad_type";
  if (isPdf && file.size > PDF_MAX_BYTES) return "bad_size";
  if (isImage && file.size > (opts.beforeResize ? RAW_IMAGE_MAX_BYTES : IMAGE_MAX_BYTES)) return "image_too_large";
  return null;
}

/** Width and height that fit within `max` on the long side, keeping the aspect ratio; never upscales. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
