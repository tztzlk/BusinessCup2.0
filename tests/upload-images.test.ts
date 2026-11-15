import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { imageSize, sniffType } from "../lib/extraction";
import { fitWithin, IMAGE_MAX_BYTES, RAW_IMAGE_MAX_BYTES, UPLOAD_IMAGE_SIDE, uploadProblem } from "../lib/upload";

// Real files made with Pillow (tests/fixtures/images) and the extraction eval's PNG photo of a W-2.
const read = (name: string) => new Uint8Array(readFileSync(name));
const size = (name: string) => {
  const b = read(name);
  const t = sniffType(b);
  if (!t || t === "heic") throw new Error(`unexpected type for ${name}`);
  return imageSize(b, t);
};

describe("image size from the file header", () => {
  it("reads JPEG (baseline and progressive with EXIF), PNG, WebP (lossy, lossless, extended) and GIF", () => {
    expect(size("tests/fixtures/images/wide-9000x40.jpg")).toEqual({ width: 9000, height: 40 });
    expect(size("tests/fixtures/images/progressive-exif-300x200.jpg")).toEqual({ width: 300, height: 200 });
    expect(size("tests/fixtures/images/lossy-300x200.webp")).toEqual({ width: 300, height: 200 });
    expect(size("tests/fixtures/images/lossless-300x200.webp")).toEqual({ width: 300, height: 200 });
    expect(size("tests/fixtures/images/alpha-300x200.webp")).toEqual({ width: 300, height: 200 });
    expect(size("tests/fixtures/images/small-300x200.gif")).toEqual({ width: 300, height: 200 });
    const png = size("scripts/eval-extract/fixtures/official_w2_jordan_photo.png");
    expect(png && png.width > 0 && png.height > 0).toBe(true);
  });

  it("returns null for a truncated header instead of guessing", () => {
    expect(imageSize(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]), "image/jpeg")).toBeNull();
  });
});

describe("photos are shrunk in the browser before upload", () => {
  it("fits the long side without upscaling or changing the aspect ratio", () => {
    expect(fitWithin(8064, 6048, UPLOAD_IMAGE_SIDE)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3024, 4032, UPLOAD_IMAGE_SIDE)).toEqual({ width: 1800, height: 2400 });
    expect(fitWithin(1200, 900, UPLOAD_IMAGE_SIDE)).toEqual({ width: 1200, height: 900 });
  });

  it("accepts large phone photos and HEIC when picked, but not after shrinking", () => {
    const photo = { name: "IMG_0001.jpg", type: "image/jpeg", size: 20 * 1024 * 1024 };
    expect(uploadProblem(photo, { beforeResize: true })).toBeNull();
    expect(uploadProblem(photo)).toBe("image_too_large");
    expect(uploadProblem({ ...photo, size: RAW_IMAGE_MAX_BYTES + 1 }, { beforeResize: true })).toBe("image_too_large");

    const heic = { name: "IMG_0002.HEIC", type: "image/heic", size: 2 * 1024 * 1024 };
    expect(uploadProblem(heic, { beforeResize: true })).toBeNull();
    // If the browser couldn't convert it, the HEIC itself is still refused.
    expect(uploadProblem(heic)).toBe("bad_type");

    expect(uploadProblem({ name: "w2.jpg", type: "image/jpeg", size: IMAGE_MAX_BYTES })).toBeNull();
    expect(uploadProblem({ name: "notes.docx", type: "application/msword", size: 1000 }, { beforeResize: true })).toBe("bad_type");
  });
});
