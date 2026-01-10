import {
  assertAllowedImageType,
  detectFileTypeFromMagicBytes,
  getExtension,
  isAllowedDetectedType,
} from '../src/lib/validation';

describe('validation', () => {
  test('getExtension', () => {
    expect(getExtension('cat.jpg')).toBe('jpg');
    expect(getExtension('cat.PNG')).toBe('png');
    expect(getExtension('noext')).toBe('');
  });

  test('assertAllowedImageType accepts matching ext/contentType', () => {
    expect(assertAllowedImageType('cat.jpg', 'image/jpeg')).toEqual({ ext: 'jpg', contentType: 'image/jpeg' });
    expect(assertAllowedImageType('cat.png', 'image/png')).toEqual({ ext: 'png', contentType: 'image/png' });
    expect(assertAllowedImageType('cat.webp', 'image/webp')).toEqual({ ext: 'webp', contentType: 'image/webp' });
  });

  test('assertAllowedImageType rejects mismatches', () => {
    expect(() => assertAllowedImageType('cat.png', 'image/jpeg')).toThrow(/extension must match/i);
    expect(() => assertAllowedImageType('cat.jpeg', 'image/jpeg')).toThrow(/Only/i);
    expect(() => assertAllowedImageType('cat.gif', 'image/gif')).toThrow(/Only/i);
  });

  test('detectFileTypeFromMagicBytes detects jpeg/png/webp', () => {
    // JPEG FF D8 FF
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(detectFileTypeFromMagicBytes(jpeg)).toBe('jpeg');

    // PNG signature
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
    expect(detectFileTypeFromMagicBytes(png)).toBe('png');

    // WebP: RIFF....WEBP
    const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    expect(detectFileTypeFromMagicBytes(webp)).toBe('webp');

    const unknown = Uint8Array.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    expect(detectFileTypeFromMagicBytes(unknown)).toBe('unknown');
  });

  test('isAllowedDetectedType', () => {
    expect(isAllowedDetectedType('jpeg')).toBe(true);
    expect(isAllowedDetectedType('png')).toBe(true);
    expect(isAllowedDetectedType('webp')).toBe(true);
    expect(isAllowedDetectedType('unknown')).toBe(false);
  });
});
