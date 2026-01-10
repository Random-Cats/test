export type AllowedImageExt = 'jpg' | 'png' | 'webp';
export type AllowedContentType = 'image/jpeg' | 'image/png' | 'image/webp';

const allowedExt = new Set<AllowedImageExt>(['jpg', 'png', 'webp']);
const allowedContentTypes = new Set<AllowedContentType>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.slice(lastDot + 1).toLowerCase();
}

export function assertAllowedImageType(fileName: string, contentType: string): {
  ext: AllowedImageExt;
  contentType: AllowedContentType;
} {
  const extRaw = getExtension(fileName);
  if (!allowedExt.has(extRaw as AllowedImageExt)) {
    throw new Error('Only .jpg, .png, .webp images are allowed');
  }
  if (!allowedContentTypes.has(contentType as AllowedContentType)) {
    throw new Error('Only image/jpeg, image/png, image/webp content types are allowed');
  }

  // Map ext to expected content type
  const expected: Record<AllowedImageExt, AllowedContentType> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  const ext = extRaw as AllowedImageExt;
  const ct = contentType as AllowedContentType;

  if (expected[ext] !== ct) {
    throw new Error('fileName extension must match contentType');
  }

  return { ext, contentType: ct };
}

export type DetectedFileType = 'jpeg' | 'png' | 'webp' | 'unknown';

export function detectFileTypeFromMagicBytes(bytes: Uint8Array): DetectedFileType {
  if (bytes.length < 12) return 'unknown';

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSig.every((b, i) => bytes[i] === b)) return 'png';

  // WebP: RIFF....WEBP
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff === 'RIFF' && webp === 'WEBP') return 'webp';

  return 'unknown';
}

export function isAllowedDetectedType(t: DetectedFileType): boolean {
  return t === 'jpeg' || t === 'png' || t === 'webp';
}
