/*
 * Weather and day/night presets for the WebGL sky.
 *
 * The story only knows a handful of keys (`rain`, `bolt`, `heavyrain`, `snow`
 * for the weather and `morning`/`evening`/`night`/`lateAtNight` for the
 * day/night cycle). This module is the single place that translates those keys
 * into shader friendly numbers, so adding a new weather never touches the
 * renderer.
 *
 * @module chapter_manager/weather/presets
 */

/**
 * @typedef {Object} SkyPalette
 * @property {[number, number, number]} top - Top color in the 0..1 range.
 * @property {[number, number, number]} bottom - Bottom color in the 0..1 range.
 * @property {number} stars - Star intensity.
 * @property {number} moon - Moon visibility.
 */

/**
 * @typedef {Object} WeatherPreset
 * @property {number} rain - Rain intensity.
 * @property {number} snow - Snow intensity.
 * @property {number} clouds - Cloud coverage.
 * @property {boolean} lightning - Whether the preset has lightning.
 * @property {number} wind - Horizontal drift applied to the rain.
 */

/**
 * @typedef {Object} SkyState
 * @property {number} rain
 * @property {number} snow
 * @property {number} clouds
 * @property {number} lightning
 * @property {number} stars
 * @property {number} moon
 * @property {number} wind
 * @property {[number, number, number]} top
 * @property {[number, number, number]} bottom
 */

/**
 * Hex color to a normalized RGB tuple.
 *
 * @param {string} hex - Color in the `#rrggbb` format.
 * @returns {[number, number, number]} Normalized color.
 */
const hex = (hex) => {
  const int = parseInt(hex.replace('#', ''), 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
};

/**
 * Palettes indexed by the day/night cycle key.
 *
 * @type {Record<string, SkyPalette>}
 */
export const SKY_PALETTES = {
  morning: { top: hex('#3d5f96'), bottom: hex('#b9cde3'), stars: 0, moon: 0 },
  evening: { top: hex('#2b2340'), bottom: hex('#c4814f'), stars: 0.12, moon: 0.35 },
  night: { top: hex('#03050c'), bottom: hex('#0d1526'), stars: 1, moon: 1 },
  lateAtNight: { top: hex('#010206'), bottom: hex('#060a14'), stars: 1, moon: 1 },
};

/** Palette used before the story sets a day/night cycle. */
export const DEFAULT_PALETTE = SKY_PALETTES.night;

/**
 * Weather presets indexed by the story weather key.
 *
 * @type {Record<string, WeatherPreset>}
 */
export const WEATHER_PRESETS = {
  sun: { rain: 0, snow: 0, clouds: 0.55, lightning: false, wind: 0 },
  rain: { rain: 0.6, snow: 0, clouds: 0.85, lightning: false, wind: 0.1 },
  heavyrain: { rain: 1, snow: 0, clouds: 1, lightning: false, wind: 0.22 },
  bolt: { rain: 0.9, snow: 0, clouds: 1, lightning: true, wind: 0.3 },
  snow: { rain: 0, snow: 1, clouds: 0.8, lightning: false, wind: 0.05 },
};

/** Weather used when the story does not define one. */
export const DEFAULT_WEATHER = 'sun';

/**
 * Moon phases, in the order the story walks through them.
 *
 * The shader only understands a single number (0 = new, 1 = full), so the
 * phase is stored as an index and converted by {@link getMoonPhase}.
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
 * Converts a moon phase name into the 0..1 value used by the shader.
 *
 * @param {string|number|null|undefined} phase - Phase name or index.
 * @returns {number} Phase in the 0..1 range.
 */
export const getMoonPhase = (phase) => {
  if (typeof phase === 'number' && isFinite(phase)) {
    return Math.min(1, Math.max(0, phase));
  }

  const index = MOON_PHASES.indexOf(String(phase));
  if (index < 0) return 1;
  return index / (MOON_PHASES.length - 1);
};

/**
 * Resolves the full sky state for a weather/day-cycle pair.
 *
 * @param {string|null|undefined} weather - Weather key.
 * @param {string|null|undefined} dayCycle - Day/night cycle key.
 * @returns {SkyState} Shader ready state.
 */
export const resolveSkyState = (weather, dayCycle) => {
  const preset = WEATHER_PRESETS[String(weather)] ?? WEATHER_PRESETS[DEFAULT_WEATHER];
  const palette = SKY_PALETTES[String(dayCycle)] ?? DEFAULT_PALETTE;

  // Overcast weather hides the stars and the moon.
  const overcast = Math.max(preset.rain, preset.snow) * 0.8;

  return {
    rain: preset.rain,
    snow: preset.snow,
    clouds: preset.clouds,
    lightning: preset.lightning ? 1 : 0,
    stars: palette.stars * (1 - overcast),
    moon: palette.moon * (1 - overcast),
    wind: preset.wind,
    top: palette.top,
    bottom: palette.bottom,
  };
};

/**
 * Weather keys understood by the story files.
 *
 * @type {string[]}
 */
export const WEATHER_KEYS = Object.keys(WEATHER_PRESETS);
