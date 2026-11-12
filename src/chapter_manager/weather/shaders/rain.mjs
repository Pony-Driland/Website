/*
 * Rain, in its own module so it never fights the snow for the same uniforms.
 *
 * The streak is a capsule (a segment with rounded caps) aligned with the fall
 * direction, not a stretched dot: a stretched dot loses its brightness as soon
 * as the wind tilts it.
 *
 * @module chapter_manager/weather/shaders/rain
 */

/**
 * GLSL for `rainLayer()`.
 *
 * Requires `hash21()` and `u_wind` to be in scope.
 */
export const RAIN_GLSL = `
/**
 * One depth layer of rain.
 *
 * @param vec2 uv        Aspect corrected coordinates.
 * @param float scale    Cells per screen. Higher is smaller and further away.
 * @param float scroll   Pre-wrapped 0..1 scroll offset.
 * @param float seed     Per-layer randomisation.
 * @param float density  Fraction of cells that contain a drop (0..1).
 * @param float width    Half width of the streak, in cell units.
 * @param float length   Length of the streak, in cell units.
 */
float rainLayer(vec2 uv, float scale, float scroll, float seed, float density, float width, float length) {
  // Tilt the whole layer with the wind. The shear is applied before the cell
  // lookup, so the drops themselves stay aligned with their own motion.
  float shear = u_wind * 1.8 + gust(u_time * 0.7 + seed) * 0.12 * u_wind;

  vec2 p = uv * scale;
  p.y += scroll * scale;
  p.x += p.y * shear;

  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;

  // Sparse: only some cells hold a drop.
  if (hash21(id + seed) > density) return 0.0;

  // Random sub-cell offset so the grid never shows up.
  vec2 offset = vec2(hash21(id + seed + 1.7), hash21(id + seed + 3.1)) - 0.5;
  vec2 local = f - offset * 0.55;

  // The drop is a vertical capsule. The along axis follows the fall direction,
  // so the streak stays glued to the motion when the wind tilts it.
  vec2 dir = normalize(vec2(shear, 1.0));
  float along = dot(local, dir);
  float across = dot(local, vec2(dir.y, -dir.x));

  float body = 1.0 - smoothstep(0.0, width, abs(across));
  float tail = 1.0 - smoothstep(0.0, length, abs(along));

  // Bright head, fading tail.
  float head = mix(0.35, 1.0, smoothstep(-length, length, along));

  return body * tail * head;
}
`;
