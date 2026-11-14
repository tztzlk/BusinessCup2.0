// Upload limits shared by the browser (checked before sending) and /api/extract (enforced).

/** Claude takes images up to 10 MB base64-encoded (about 7.5 MB raw); PDFs up to the request limit. */
export const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 7 * 1024 * 1024;
/** Pay stubs and W-2s are one or two pages; longer PDFs are rejected before calling Claude. */
export const PDF_MAX_PAGES = 5;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

/**
 * Error code for a file that would be rejected, or null if it may be sent. Uses the declared type
 * and extension only; the server still checks the real bytes.
 */
export function uploadProblem(file: { name: string; type: string; size: number }): string | null {
  if (file.size === 0) return "bad_size";
  const isPdf = file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name));
  const isImage = IMAGE_TYPES.includes(file.type) || (!file.type && IMAGE_EXT.test(file.name));
  if (!isPdf && !isImage) return "bad_type";
  if (isPdf && file.size > PDF_MAX_BYTES) return "bad_size";
  if (isImage && file.size > IMAGE_MAX_BYTES) return "image_too_large";
  return null;
}
