/*
 * Weather and day/night presets for the WebGL sky.
 *
 * The story only knows a handful of keys (`rain`, `bolt`, `heavyrain`, `snow`,
 * `snowstorm` for the weather and `morning`/`evening`/`night`/`lateAtNight`
 * for the day/night cycle). This module is the single place that translates
 * those keys into shader friendly numbers, so adding a new weather never
 * touches the renderer.
 *
 * The actual colors live in `./palettes.mjs`.
 *
 * @module chapter_manager/weather/presets
 */

import {
  AUTO_MOON_PHASES,
  MOON_PHASES,
  SKY_PALETTE_COLORS,
  WEATHER_LIMITS,
  WEATHER_PRESET_COLORS,
  hex,
} from './palettes.mjs';

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
 * @property {number} wind - Horizontal drift applied to the precipitation.
 * @property {number} rainSpeed - Rain motion multiplier.
 * @property {number} snowSpeed - Snow motion multiplier.
 * @property {boolean} [storm] - Whether this preset is a snowstorm.
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
 * @property {number} rainSpeed
 * @property {number} snowSpeed
 * @property {number} storm - 0 for calm snow, 1 for a snowstorm.
 * @property {[number, number, number]} top
 * @property {[number, number, number]} bottom
 */

/**
 * Clamps a value to the given range, falling back when it is not a number.
 *
 * @param {unknown} value - Raw value.
 * @param {[number, number]} range - Minimum and maximum.
 * @param {number} fallback - Value used when `value` is not usable.
 * @returns {number} Safe value.
 */
const clamp = (value, range, fallback) => {
  if (typeof value !== 'number' || !isFinite(value)) return fallback;
  return Math.min(range[1], Math.max(range[0], value));
};

/**
 * Palettes indexed by the day/night cycle key, with the colors already
 * converted to the 0..1 range.
 *
 * @type {Record<string, SkyPalette>}
 */
export const SKY_PALETTES = Object.fromEntries(
  Object.entries(SKY_PALETTE_COLORS).map(([key, palette]) => [
    key,
    {
      top: hex(palette.top),
      bottom: hex(palette.bottom),
      stars: palette.stars,
      moon: palette.moon,
    },
  ]),
);

/** Palette used before the story sets a day/night cycle. */
export const DEFAULT_PALETTE = SKY_PALETTES.night;

/**
 * Weather presets indexed by the story weather key.
 *
 * @type {Record<string, WeatherPreset>}
 */
export const WEATHER_PRESETS = WEATHER_PRESET_COLORS;

/** Weather used when the story does not define one. */
export const DEFAULT_WEATHER = 'sun';

export { MOON_PHASES };

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
 * Returns the moon phase the story would use for a day/night cycle.
 *
 * @param {string|null|undefined} dayCycle - Day/night cycle key.
 * @returns {string|null} Phase name, or `null` when unknown.
 */
export const getAutoMoonPhase = (dayCycle) => AUTO_MOON_PHASES[String(dayCycle)] ?? null;

/**
 * Resolves the full sky state for a weather/day-cycle pair.
 *
 * @param {string|null|undefined} weather - Weather key.
 * @param {string|null|undefined} dayCycle - Day/night cycle key.
 * @param {{ wind?: number, speed?: number }} [overrides] - Per-line overrides.
 * @returns {SkyState} Shader ready state.
 */
export const resolveSkyState = (weather, dayCycle, overrides = {}) => {
  const preset = WEATHER_PRESETS[String(weather)] ?? WEATHER_PRESETS[DEFAULT_WEATHER];
  const palette = SKY_PALETTES[String(dayCycle)] ?? DEFAULT_PALETTE;

  // A story override always wins over the preset, but it is clamped so a typo
  // can never freeze or invert the sky.
  const wind = clamp(overrides.wind, WEATHER_LIMITS.wind, preset.wind);
  const speed = clamp(overrides.speed, WEATHER_LIMITS.speed, 1);

  // Overcast weather hides the stars and the moon.
  const overcast = Math.max(preset.rain, preset.snow) * 0.8;

  return {
    rain: preset.rain,
    snow: preset.snow,
    clouds: preset.clouds,
    lightning: preset.lightning ? 1 : 0,
    stars: palette.stars * (1 - overcast),
    moon: palette.moon * (1 - overcast),
    wind,
    rainSpeed: preset.rainSpeed * speed,
    snowSpeed: preset.snowSpeed * speed,
    storm: preset.storm ? 1 : 0,
    top: palette.top,
    bottom: palette.bottom,
  };
};

/**
 * Whether the moon is hidden for the given day/night cycle.
 *
 * The phase is only allowed to change while the moon is not on screen, so the
 * reader uses this to decide when it may pick a new phase.
 *
 * @param {string|null|undefined} dayCycle - Day/night cycle key.
 * @returns {boolean} `true` when the moon is not visible.
 */
export const isMoonHidden = (dayCycle) => {
  const palette = SKY_PALETTES[String(dayCycle)];
  return !palette || palette.moon <= 0.001;
};

/**
 * Weather keys understood by the story files.
 *
 * @type {string[]}
 */
export const WEATHER_KEYS = Object.keys(WEATHER_PRESETS);
