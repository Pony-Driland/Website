/*
 * Moon phase state machine.
 *
 * The moon must never visibly change shape: a reader who is looking at the sky
 * while the story moves from `night` to `lateAtNight` would see the disc pop
 * from full to gibbous, which breaks the illusion. The phase is therefore
 * *locked* while the moon is on screen and only re-evaluated while it is
 * hidden.
 *
 * The story can also pin the phase for a specific night with the `moonPhase`
 * key. That value only applies to the night it was declared on, so one chapter
 * cannot leak its moon into the next one.
 *
 * @module chapter_manager/weather/moon
 */

import { MOON_PHASES, getAutoMoonPhase, isMoonHidden } from './presets.mjs';

/**
 * @typedef {Object} MoonController
 * @property {() => void} reset - Forces the next `update()` to recompute.
 * @property {(phase: string|null) => void} setManual - Pins the phase.
 * @property {(dayCycle: string|null, night: number) => string} update - Applies a cycle.
 * @property {() => string} get - Phase currently rendered.
 */

/**
 * Creates an isolated moon controller.
 *
 * @returns {MoonController} Moon controller.
 */
export const createMoon = () => {
  /** @type {string} */
  let phase = 'full';

  /** Whether `phase` still has to be committed. */
  let pending = true;

  /** Night the phase was locked on. */
  let night = -1;

  /** Phase pinned by the story, if any. */
  /** @type {string|null} */
  let manual = null;

  /**
   * Forgets the current night so the next `update()` recomputes the phase.
   *
   * @returns {void}
   */
  const reset = () => {
    pending = true;
  };

  /**
   * Pins the phase for the current night.
   *
   * Passing `null` (or an unknown name) restores the automatic behaviour.
   *
   * @param {string|null} value - Phase name or `null`.
   * @returns {void}
   */
  const setManual = (value) => {
    manual = typeof value === 'string' && MOON_PHASES.includes(value) ? value : null;
    pending = true;
  };

  /**
   * Applies a new day/night cycle and returns the phase that must be drawn.
   *
   * The phase only changes while the moon is hidden. When the story pins a
   * phase it wins, but it is still deferred until the moon goes away, so the
   * disc never morphs in front of the reader.
   *
   * @param {string|null} dayCycle - Day/night cycle key.
   * @param {number} currentNight - Identifier of the current night.
   * @returns {string} Phase to render.
   */
  const update = (dayCycle, currentNight) => {
    // A new night starts with a clean slate: a phase pinned for the previous
    // night must not leak into this one.
    if (currentNight !== night) {
      night = currentNight;
      pending = true;
    }

    if (!pending) return phase;

    // The moon is on screen, so its shape has to stay exactly as it is.
    if (!isMoonHidden(dayCycle)) return phase;

    phase = manual ?? getAutoMoonPhase(dayCycle) ?? phase;
    pending = false;
    return phase;
  };

  return {
    reset,
    setManual,
    update,
    get: () => phase,
  };
};

export default createMoon;
