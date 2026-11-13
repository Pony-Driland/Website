/*
 * Snowstorm, in its own module.
 *
 * A snowstorm is not "snow, but faster". The flakes are driven sideways by a
 * gusting wind, so they travel on a steep diagonal, stretch into short streaks
 * and arrive in bursts. Reusing `snowLayer()` with a bigger speed multiplier
 * only makes the same calm snow fall quickly, which is why this lives here.
 *
 * ## Why the layer is rotated instead of sheared
 *
 * The scroll offset is wrapped to 0..1 in JS, so the shader only ever sees a
 * small number. That wrap is only invisible while the pattern is periodic in
 * the scroll axis. Shearing the cell grid (`p.x += p.y * shear`) breaks that
 * periodicity as soon as `shear` is not an integer, which is what made the
 * flakes clump and jump every time the offset wrapped.
 *
 * Rotating the whole layer keeps the cell grid a rigid, periodic lattice, so
 * one full scroll is exactly `scale` cells and the wrap is invisible.
 *
 * ## Why the gust never touches the scroll
 *
 * The gust used to multiply the scroll (`scroll * (0.75 + gust * 0.5)`). Its
 * derivative is `dscroll/dt * gust + scroll * dgust/dt`, so the second term
 * grew with the scroll and could even reverse the motion: the storm started
 * at the right speed and crawled a few seconds later. The gust now only
 * changes the streak length, which is purely visual and cannot feed back into
 * the position.
 *
 * @module chapter_manager/weather/shaders/snowstorm
 */

/**
 * GLSL for `snowstormLayer()`.
 *
 * Requires `hash21()`, `u_time`, `u_wind` and `u_resolution` to be in scope.
 */
export const SNOWSTORM_GLSL = `
/**
 * A gust of wind, in the 0..1 range.
 *
 * Two sines at different rates, so the storm never settles into a rhythm the
 * eye can lock on to.
 */
float stormGust(float t, float seed) {
  return 0.55 + 0.45 * sin(t * 0.7 + seed) * sin(t * 0.23 + seed * 2.1);
}

/**
 * One depth layer of a snowstorm.
 *
 * The whole layer is rotated by the wind and scrolled along a single axis.
 * Rotating (instead of shearing) is what keeps the wrap seamless: the cell
 * grid stays a rigid, periodic lattice, so advancing the scroll by one cell
 * lands on the exact same pattern.
 *
 * @param vec2 uv        Screen coordinates, 0..1.
 * @param float scale    Cells per screen height. Must be a whole number.
 * @param float scroll   Pre-wrapped 0..1 scroll offset.
 * @param float seed     Per-layer randomisation.
 * @param float density  Fraction of cells that contain a flake (0..1).
 * @param float radius   Base radius, in cell units.
 */
float snowstormLayer(vec2 uv, float scale, float scroll, float seed, float density, float radius) {
  // The wind tilts the fall. A single rotation keeps the cell grid periodic,
  // so the scroll can wrap without the field ever jumping.
  float angle = 0.42 + u_wind * 0.55;
  float ca = cos(angle);
  float sa = sin(angle);

  // Aspect correct first, so a flake is round on any screen and the rotation
  // below is a true rotation instead of a stretch.
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  p = vec2(ca * p.x + sa * p.y, -sa * p.x + ca * p.y) * scale;

  // Only the vertical axis scrolls, and it scrolls linearly. That is what
  // makes the wrap invisible: one full scroll is exactly \`scale\` cells.
  p.y += scroll * scale;

  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;

  // Only the scrolling axis has to wrap. The horizontal index is stable, so
  // leaving it alone gives the field a much longer period (no visible tiling).
  vec2 pid = vec2(id.x, mod(id.y, scale));

  float rnd = hash21(pid + seed);
  if (rnd > density) return 0.0;

  // Each flake owns a phase and a speed, so the field never pulses in sync.
  float phase = hash21(pid + seed + 31.7) * 6.2831;
  float speed = 1.6 + 2.4 * hash21(pid + seed + 47.3);

  // The sway is small and fast: the wind dominates, the flake just wobbles.
  vec2 sway;
  sway.x = sin(u_time * speed + phase) * 0.10;
  sway.y = sin(u_time * speed * 0.8 + phase * 1.7) * 0.10;

  // Size and brightness vary per flake. The square makes small flakes common
  // and big ones rare, which is how real snowfall looks.
  vec2 offset = vec2(hash21(pid + seed + 5.3), hash21(pid + seed + 9.1)) - 0.5;
  float sizeRnd = hash21(pid + seed + 13.7);
  float size = radius * (0.30 + 0.70 * sizeRnd * sizeRnd);

  // The gust stretches the streak, which is what reads as speed. It is the
  // only thing the gust is allowed to touch, so it can never slow the storm.
  float gust = stormGust(u_time, seed);
  float streak = 1.0 + gust * 1.8;

  vec2 local = f - offset * 0.3 - sway;

  // The flake is a capsule along the travel direction, not a circle.
  float body = 1.0 - smoothstep(size * 0.45, size, abs(local.x));
  float tail = 1.0 - smoothstep(0.0, size * streak, abs(local.y));

  float flake = body * tail;

  // Fade the smallest flakes so they do not shimmer as they cross a pixel.
  float brightness = mix(0.40, 1.0, sizeRnd);
  return flake * brightness;
}
`;
