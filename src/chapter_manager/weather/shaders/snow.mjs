/*
 * Snow, in its own module so it never fights the rain for the same uniforms.
 *
 * ## Why the cell hash is periodic
 *
 * The scroll offset is wrapped to 0..1 in JS so the GPU never sees a large
 * number. That wrap is only invisible if the pattern repeats with the same
 * period, which is why the cell index is taken modulo the layer scale before
 * it reaches the hash. Without the mod() the whole field jumps to a different
 * random arrangement once per wrap, which is the "groups of flakes
 * teleporting" bug.
 *
 * ## Why the sway is applied after the cell lookup
 *
 * The flake identity comes from floor(p). Anything that moves p before that
 * call changes the cell, and a new cell means a new random position, so the
 * flake teleports. The sway therefore has to be applied to the flake position
 * inside its own cell, never to the coordinate used to find the cell.
 *
 * @module chapter_manager/weather/shaders/snow
 */

/**
 * GLSL for snowLayer().
 *
 * Requires hash21(), u_time and u_wind to be in scope.
 */
export const SNOW_GLSL = `
/**
 * One depth layer of snow.
 *
 * Every flake drifts on its own figure-eight, driven by two sines at different
 * rates. The phase and the speed come from the cell, so a flake keeps its own
 * rhythm for as long as it lives and no two neighbours ever move together.
 *
 * @param vec2 uv        Aspect corrected coordinates.
 * @param float scale    Cells per screen. Must be a whole number.
 * @param float scroll   Pre-wrapped 0..1 scroll offset.
 * @param float seed     Per-layer randomisation.
 * @param float density  Fraction of cells that contain a flake (0..1).
 * @param float radius   Base radius, in cell units.
 */
float snowLayer(vec2 uv, float scale, float scroll, float seed, float density, float radius) {
  vec2 p = uv * scale;
  p.y += scroll * scale;

  // The wind is constant for the whole layer, so it is safe to fold it into
  // the cell coordinate: it shifts every flake by the same amount.
  p.x += u_wind * 2.0;

  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;

  // The scroll wraps every scale cells, so the pattern has to repeat with the
  // same period. Wrapping the row index is what makes the wrap invisible.
  vec2 pid = vec2(id.x, mod(id.y, scale));

  float rnd = hash21(pid + seed);
  if (rnd > density) return 0.0;

  // Each flake owns a phase and a speed, so the field never pulses in sync.
  float phase = hash21(pid + seed + 31.7) * 6.2831;
  float speed = 0.45 + 0.85 * hash21(pid + seed + 47.3);

  // Two sines at different rates give a lazy figure-eight instead of a line.
  vec2 sway;
  sway.x = sin(u_time * speed + phase) * 0.16;
  sway.y = sin(u_time * speed * 0.6 + phase * 1.7) * 0.06;

  // Size and brightness vary per flake. The square makes small flakes common
  // and big ones rare, which is how real snowfall looks.
  vec2 offset = vec2(hash21(pid + seed + 5.3), hash21(pid + seed + 9.1)) - 0.5;
  float sizeRnd = hash21(pid + seed + 13.7);
  float size = radius * (0.30 + 0.70 * sizeRnd * sizeRnd);

  float d = length(f - offset * 0.3 - sway);

  // Soft edge, solid core. The 0.45 keeps the flake round at any size.
  float flake = 1.0 - smoothstep(size * 0.45, size, d);

  // Fade the smallest flakes so they do not shimmer as they cross a pixel.
  float brightness = mix(0.40, 1.0, sizeRnd);
  return flake * brightness;
}
`;
