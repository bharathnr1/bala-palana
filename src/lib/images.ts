/**
 * Pure image maths for the phone-side compression (D16). Keeping the sizing
 * out of the canvas code makes the rule testable in Node.
 */

/** The longest edge a photo is scaled down to before upload. */
export const IMAGE_LONG_EDGE = 1600;

/** The size compression aims for; the accepted ceiling is a little higher. */
export const IMAGE_TARGET_BYTES = 200 * 1024;

export type ImageSize = { width: number; height: number };

/**
 * Scale an image down so its longest edge is at most `longEdge`, preserving
 * the aspect ratio. Smaller images are returned unchanged.
 */
export function fitWithin(
  width: number,
  height: number,
  longEdge: number = IMAGE_LONG_EDGE,
): ImageSize {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 1, height: 1 };
  }
  if (longEdge <= 0) return { width: Math.round(width), height: Math.round(height) };

  const longest = Math.max(width, height);
  if (longest <= longEdge) return { width: Math.round(width), height: Math.round(height) };

  const scale = longEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
