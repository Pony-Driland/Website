import moment from 'moment';

/**
 * Converts all ISO 8601 (UTC) strings within a text to their numeric timestamp (valueOf).
 *
 * @param {string} inputString - The input text containing ISO 8601 dates.
 * @returns {string} - The text with all dates replaced by their millisecond timestamps.
 * @throws {TypeError} - If the input provided is not a string.
 */
export const convertIsoStringsToCalendar = (inputString) => {
  // Argument validation
  if (typeof inputString !== 'string')
    throw new TypeError('The argument "inputString" must be a string.');

  /**
   * @type {RegExp} isoRegex - Regex to match ISO 8601 UTC format
   */
  const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g;
  return inputString.replace(isoRegex, (match) => {
    const date = moment(match);
    if (date.isValid()) return date.calendar();
    return match;
  });
};
