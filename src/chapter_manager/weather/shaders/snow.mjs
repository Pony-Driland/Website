/*
 * Snow, in its own module so it never fights the rain for the same uniforms.
 *
 * The flake is a perfect circle in cell space. Everything that moves the flake
 * is applied to the cell lookup, never to the distance, because shearing the
 * distance is what turns a circle into an ellipse.
 *
 * @module chapter_manager/weather/shaders/snow
 */

/**
 * GLSL for `snowLayer()`.
 *
 * Requires `hash21()` and `u_wind` to be in scope.
 */
export const SNOW_GLSL = `
/**
 * One depth layer of snow.
 *
 * Every flake falls at its own pace and sways on its own rhythm, so the layer
 * never reads as a scrolling texture. The sway is a slow sine of the flake's
 * own Y, which keeps neighbours in sync like real air while still giving each
 * flake a slightly different path.
 *
 * @param vec2 uv        Aspect corrected coordinates.
 * @param float scale    Cells per screen. Higher is smaller and further away.
 * @param float scroll   Pre-wrapped 0..1 scroll offset.
 * @param float seed     Per-layer randomisation.
 * @param float density  Fraction of cells that contain a flake (0..1).
 * @param float radius   Base radius, in cell units.
 */
float snowLayer(vec2 uv, float scale, float scroll, float seed, float density, float radius) {
  vec2 p = uv * scale;
  p.y += scroll * scale;

  // Sway the whole layer sideways. Applied before the cell lookup so the flake
  // keeps its round shape, and driven by the flake's own Y so the motion is
  // continuous instead of per-cell.
  p.x += sin(p.y * 0.55 + seed * 6.28) * 0.45;
  p.x += u_wind * 2.0;

  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;

  float rnd = hash21(id + seed);
  if (rnd > density) return 0.0;

  // Each flake sits somewhere inside its own cell, so the grid never shows.
  vec2 offset = vec2(hash21(id + seed + 5.3), hash21(id + seed + 9.1)) - 0.5;

  // Size and brightness vary per flake. The cube makes small flakes common and
  // big ones rare, which is how real snowfall looks.
  float sizeRnd = hash21(id + seed + 13.7);
  float size = radius * (0.35 + 0.65 * sizeRnd * sizeRnd);
  float d = length(f - offset * 0.6);

  // Soft edge, solid core. The 0.45 keeps the flake round even at 1px.
  float flake = 1.0 - smoothstep(size * 0.45, size, d);

  // Fade the smallest flakes so they do not shimmer as they cross a pixel.
  float brightness = mix(0.45, 1.0, sizeRnd);
  return flake * brightness;
}
`;
