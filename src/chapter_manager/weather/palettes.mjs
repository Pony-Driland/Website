/*
 * Sky palettes and weather presets.
 *
 * This file is the single place a developer needs to touch to retune the sky.
 * Nothing here knows about WebGL, the reader or the story format: it is only
 * data. `presets.mjs` turns it into shader uniforms.
 *
 * Colors are written as `#rrggbb` and converted to the 0..1 range on load, so
 * they can be copied straight from a color picker.
 *
 * @module chapter_manager/weather/palettes
 */

/**
 * Converts `#rrggbb` into a normalized RGB tuple.
 *
 * @param {string} hex - Color in the `#rrggbb` format.
 * @returns {[number, number, number]} Normalized color.
 */
export const hex = (hex) => {
  const int = parseInt(hex.replace('#', ''), 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
};

/**
 * Sky gradient and lighting for each day/night cycle key.
 *
 * - `top` / `bottom` - vertical gradient of the sky.
 * - `stars` - star intensity (0 hides the stars entirely).
 * - `moon` - moon visibility. When this is `0` the moon is considered hidden,
 *   which is also the only moment the automatic phase is allowed to change.
 *
 * @type {Record<string, { top: string, bottom: string, stars: number, moon: number }>}
 */
export const SKY_PALETTE_COLORS = {
  morning: { top: '#3d5f96', bottom: '#b9cde3', stars: 0, moon: 0 },
  evening: { top: '#2b2340', bottom: '#c4814f', stars: 0.12, moon: 0.35 },
  night: { top: '#03050c', bottom: '#0d1526', stars: 1, moon: 1 },
  lateAtNight: { top: '#010206', bottom: '#060a14', stars: 1, moon: 1 },
};

/**
 * Weather presets, indexed by the story weather key.
 *
 * - `rain` / `snow` - particle intensity.
 * - `clouds` - cloud coverage. This is the ceiling, not the opacity: the
 *   shader still multiplies it by the cloud density.
 * - `lightning` - whether the preset can produce lightning flashes.
 * - `wind` - horizontal drift applied to the precipitation.
 * - `rainSpeed` / `snowSpeed` - motion multiplier. `1` is the tuned default,
 *   `2` is twice as fast. The story can override them per line.
 *
 * @type {Record<string, {
 *   rain: number,
 *   snow: number,
 *   clouds: number,
 *   lightning: boolean,
 *   wind: number,
 *   rainSpeed: number,
 *   snowSpeed: number,
 *   storm?: boolean,
 * }>}
 */
export const WEATHER_PRESET_COLORS = {
  sun: {
    rain: 0,
    snow: 0,
    clouds: 0.55,
    lightning: false,
    wind: 0,
    rainSpeed: 1,
    snowSpeed: 1,
  },
  rain: {
    rain: 0.6,
    snow: 0,
    clouds: 0.85,
    lightning: false,
    wind: 0.1,
    rainSpeed: 1,
    snowSpeed: 1,
  },
  heavyrain: {
    rain: 1,
    snow: 0,
    clouds: 1,
    lightning: false,
    wind: 0.22,
    rainSpeed: 1.85,
    snowSpeed: 1,
  },
  bolt: {
    rain: 0.9,
    snow: 0,
    clouds: 1,
    lightning: true,
    wind: 0.42,
    rainSpeed: 2.9,
    snowSpeed: 1,
  },
  snow: {
    rain: 0,
    snow: 1,
    clouds: 0.8,
    lightning: false,
    wind: 0.05,
    rainSpeed: 1,
    snowSpeed: 1,
  },
  snowstorm: {
    rain: 0,
    snow: 1,
    clouds: 0.95,
    lightning: false,
    wind: 0.55,
    rainSpeed: 1,
    // The storm is driven almost entirely by the wind, so the fall speed is
    // what sells it. Anything under ~4 reads as heavy snow instead of a
    // blizzard, and the shader stretches the streaks from the same value.
    snowSpeed: 6,
    storm: true,
  },
};

/**
 * Moon phases, in the order the story walks through them.
 *
 * The shader only understands a single number (0 = new, 1 = full), so the
 * phase is stored as a name and converted by `getMoonPhase()`.
 *
 * @type {string[]}
 */
export const MOON_PHASES = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

/**
 * Phase used by each day/night cycle when the story does not override it.
 *
 * The moon is only allowed to change while it is hidden, so this mapping is
 * read once per night instead of on every line.
 *
 * @type {Record<string, string>}
 */
export const AUTO_MOON_PHASES = {
  morning: 'new',
  evening: 'waxing-crescent',
  night: 'full',
  lateAtNight: 'waning-gibbous',
};

/**
 * Limits applied to the per-line overrides.
 *
 * A typo in the story file must never be able to freeze the sky, so every
 * override is clamped to a sane range.
 *
 * @type {{ speed: [number, number], wind: [number, number] }}
 */
export const WEATHER_LIMITS = {
  speed: [0.1, 6],
  wind: [0, 1],
};
