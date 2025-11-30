import { formatCustomTimer } from 'tiny-essentials/basics/clock';

// This script converts between Earth time and Pony Driland time using Earth minutes as the base.

/** Conversion time factor (Earth → Pony) */
const TIME_FACTOR = 5760 / 7; // ≈ 822.8571428571429

/**
 * @param {number} earthMinutes - Earth Minutes
 * @returns {number} Pony Driland minutes
 */
export const earthTimeToPony = (earthMinutes) => {
  // Convert Earth minutes to Pony Driland minutes
  return earthMinutes * TIME_FACTOR;
};

window.earthTimeToPony = earthTimeToPony;

/**
 * @param {number} ponyMinutes - Pony Driland Minutes
 * @returns {number} Earth Minutes
 */
export const ponyTimeToEarth = (ponyMinutes) => {
  // Convert Pony Driland minutes back to Earth minutes
  return ponyMinutes / TIME_FACTOR;
};

window.ponyTimeToEarth = ponyTimeToEarth;

window.formatCustomTimer = formatCustomTimer;
