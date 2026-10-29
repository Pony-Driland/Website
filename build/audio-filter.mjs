// build/audio-filter.mjs

/**
 * Audio asset filter used by the distributable website build.
 *
 * The repository keeps the original (heavy) audio files inside `public/audio`,
 * but the hosted website does not need all of them. This module decides, file
 * by file, if a heavy audio file should be copied to `dist/WEBSITE` or not.
 *
 * Rules (applied only to the build output, never to the source folder):
 *   1. Only files inside `audioDirs` are affected.
 *   2. Only `heavyExtensions` (default: `.wav`) can be dropped.
 *   3. A heavy file is dropped only when a lightweight version (`.mp3`, ...)
 *      with the same base name exists in the same folder.
 *   4. Heavy files smaller than `smallFileThreshold` are always kept, because
 *      they are already small enough to ship.
 *   5. Heavy files without a lightweight alternative are always kept.
 */

import fs from 'fs';
import path from 'path';

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

/** @typedef {import('fs').Dirent} Dirent */

/**
 * @typedef {object} AudioFilterOptions
 * @property {boolean} [enabled] When false, nothing is ever skipped.
 * @property {string[]} [audioDirs] Folders (relative to `root`) that hold audio assets.
 * @property {string[]} [heavyExtensions] Extensions that may be removed from the build.
 * @property {string[]} [lightweightExtensions] Extensions considered a valid replacement.
 * @property {number} [smallFileThreshold] Heavy files below this size (in bytes) are always kept.
 * @property {boolean} [log] Prints every skipped file while filtering.
 */

/** @type {Required<AudioFilterOptions>} */
export const DEFAULT_AUDIO_FILTER_OPTIONS = {
  enabled: true,
  audioDirs: ['public/audio'],
  heavyExtensions: ['.wav'],
  lightweightExtensions: ['.mp3', '.ogg', '.oga', '.m4a', '.aac', '.opus', '.webm', '.flac'],
  smallFileThreshold: 3 * MEGABYTE,
  log: true,
};

/**
 * Formats a byte amount into a human readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(KILOBYTE)), units.length - 1);
  const value = bytes / Math.pow(KILOBYTE, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/**
 * Reads a boolean-ish environment variable.
 * @param {string|undefined} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'off', 'no'].includes(String(value).trim().toLowerCase());
}

/**
 * Builds the audio filter options from the environment.
 *
 * Supported variables:
 *   AUDIO_FILTER=off            -> disables the filter completely
 *   AUDIO_SMALL_WAV_LIMIT=3     -> threshold (in MB) used by `smallFileThreshold`
 *
 * @param {Partial<AudioFilterOptions>} [overrides]
 * @returns {AudioFilterOptions}
 */
export function resolveAudioFilterOptions(overrides = {}) {
  /** @type {AudioFilterOptions} */
  const options = { ...overrides };

  if (options.enabled === undefined) {
    options.enabled = parseBoolean(process.env.AUDIO_FILTER, DEFAULT_AUDIO_FILTER_OPTIONS.enabled);
  }

  if (options.smallFileThreshold === undefined) {
    const limit = Number.parseFloat(process.env.AUDIO_SMALL_WAV_LIMIT ?? '');
    options.smallFileThreshold = Number.isFinite(limit)
      ? limit * MEGABYTE
      : DEFAULT_AUDIO_FILTER_OPTIONS.smallFileThreshold;
  }

  return options;
}

/**
 * Creates the audio filter used by the website build.
 *
 * @param {{ root?: string } & AudioFilterOptions} [config]
 */
export function createAudioFilter(config = {}) {
  const { root = process.cwd(), ...overrides } = config;
  const options = { ...DEFAULT_AUDIO_FILTER_OPTIONS, ...overrides };

  const heavyExtensions = new Set(options.heavyExtensions.map(ext => ext.toLowerCase()));
  const lightweightExtensions = new Set(options.lightweightExtensions.map(ext => ext.toLowerCase()));
  const audioDirs = options.audioDirs.map(dir => path.resolve(root, dir));
  const enabled = options.enabled !== false && audioDirs.length > 0;

  /** @type {Map<string, Dirent[]>} */
  const listingCache = new Map();
  /** @type {{ file: string, size: number, replacement: string }[]} */
  const skipped = [];
  let smallFilesKept = 0;

  /**
   * Cached `readdir` that never throws.
   * @param {string} dir
   * @returns {Dirent[]}
   */
  function listDirectory(dir) {
    const cached = listingCache.get(dir);
    if (cached) return cached;

    /** @type {Dirent[]} */
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      entries = [];
    }

    listingCache.set(dir, entries);
    return entries;
  }

  /**
   * @param {string} filePath
   * @returns {fs.Stats|null}
   */
  function statFile(filePath) {
    try {
      return fs.statSync(filePath);
    } catch {
      return null;
    }
  }

  /**
   * @param {string} filePath
   * @returns {boolean}
   */
  function isInsideAudioDir(filePath) {
    return audioDirs.some(dir => {
      const relative = path.relative(dir, filePath);
      return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
    });
  }

  /**
   * Finds a lightweight file that replaces `filePath` (same folder, same base name).
   * @param {string} filePath
   * @returns {string|null}
   */
  function findLightweightSibling(filePath) {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath)).toLowerCase();

    for (const entry of listDirectory(dir)) {
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;

      const entryExt = path.extname(entry.name);
      if (!lightweightExtensions.has(entryExt.toLowerCase())) continue;
      if (path.basename(entry.name, entryExt).toLowerCase() !== base) continue;

      return path.join(dir, entry.name);
    }

    return null;
  }

  /**
   * Returns true when the file must be kept out of the build output.
   * @param {string} filePath
   * @returns {boolean}
   */
  function shouldSkip(filePath) {
    if (!enabled) return false;

    const resolved = path.resolve(filePath);
    if (!heavyExtensions.has(path.extname(resolved).toLowerCase())) return false;
    if (!isInsideAudioDir(resolved)) return false;

    const stats = statFile(resolved);
    if (!stats || !stats.isFile()) return false;

    // Small heavy files are not worth removing from the bundle.
    if (stats.size < options.smallFileThreshold) {
      smallFilesKept++;
      return false;
    }

    const replacement = findLightweightSibling(resolved);
    if (!replacement) return false;

    skipped.push({ file: resolved, size: stats.size, replacement });
    if (options.log) {
      console.log(
        `   ⏭  audio: ${path.relative(root, resolved)} (${formatBytes(stats.size)}) ` +
          `-> ${path.basename(replacement)}`,
      );
    }

    return true;
  }

  /**
   * Returns every extension (lowercase, with the dot) present in a folder.
   * @param {string} dir
   * @returns {Set<string>}
   */
  function listExtensions(dir) {
    const extensions = new Set();
    for (const entry of listDirectory(dir)) {
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext) extensions.add(ext);
    }
    return extensions;
  }

  /**
   * Removes from `format` every heavy extension that no longer exists in the
   * folder, so the website never advertises a file that was not shipped.
   *
   * The file is edited textually (instead of being re-serialized) so the
   * original formatting of the hand written metadata is preserved.
   *
   * @param {string} jsonPath Path of the `data.json` inside the build output.
   * @returns {string[]|null} The removed extensions, or null when nothing changed.
   */
  function patchMetadataFile(jsonPath) {
    if (!enabled) return null;

    let raw;
    /** @type {any} */
    let metadata;
    try {
      raw = fs.readFileSync(jsonPath, 'utf8');
      metadata = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    if (!Array.isArray(metadata.format)) return null;

    const available = listExtensions(path.dirname(jsonPath));

    const kept = metadata.format.filter(format => {
      if (typeof format !== 'string') return true;
      const ext = `.${format.replace(/^\./, '')}`.toLowerCase();
      if (!heavyExtensions.has(ext)) return true;
      return available.has(ext);
    });

    if (kept.length === metadata.format.length) return null;

    // Replace only the `"format": [...]` value, keeping every other byte intact.
    const pattern = /("format"\s*:\s*)\[[^\]]*\]/;
    if (!pattern.test(raw)) return null;

    const updated = raw.replace(pattern, `$1${JSON.stringify(kept).replace(/,/g, ', ')}`);
    fs.writeFileSync(jsonPath, updated, 'utf8');

    return metadata.format.filter(format => !kept.includes(format));
  }

  /**
   * Recursively patches every `data.json` inside `dir`.
   * @param {string} dir
   * @param {string[]} patched
   */
  function patchMetadataTree(dir, patched) {
    /** @type {Dirent[]} */
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        patchMetadataTree(entryPath, patched);
        continue;
      }

      if (entry.name !== 'data.json') continue;
      if (patchMetadataFile(entryPath)) patched.push(entryPath);
    }
  }

  /**
   * Rewrites the `data.json` files of the build output so they stop listing the
   * heavy formats that were not copied. Must run after the copy is finished.
   *
   * @param {string} destinationRoot Root folder of the build output.
   * @param {string} [sourceRoot] Folder that was copied into `destinationRoot`.
   * @returns {string[]} Paths of the patched files.
   */
  function finalize(destinationRoot, sourceRoot = root) {
    if (!enabled) return [];

    /** @type {string[]} */
    const patched = [];

    for (const audioDir of audioDirs) {
      const relative = path.relative(sourceRoot, audioDir);
      if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
      patchMetadataTree(path.join(destinationRoot, relative), patched);
    }

    return patched;
  }

  /**
   * Aggregated information about the filtering session.
   */
  function summary() {
    return {
      enabled,
      skipped: [...skipped],
      skippedCount: skipped.length,
      skippedBytes: skipped.reduce((total, item) => total + item.size, 0),
      smallFilesKept,
      smallFileThreshold: options.smallFileThreshold,
    };
  }

  /**
   * Prints a summary of everything that was filtered out.
   */
  function logSummary() {
    if (!enabled) {
      console.log('🔇 Audio filter disabled, every audio file was copied.');
      return;
    }

    const { skippedCount, skippedBytes, smallFilesKept, smallFileThreshold } = summary();

    if (skippedCount === 0) {
      console.log('🔊 Audio filter: no heavy audio file was removed.');
      return;
    }

    console.log(
      `🔊 Audio filter: ${skippedCount} heavy file(s) skipped (${formatBytes(skippedBytes)} saved).`,
    );
    console.log(
      `   ${smallFilesKept} heavy file(s) kept because they are smaller than ${formatBytes(smallFileThreshold)}.`,
    );
  }

  return { enabled, options, shouldSkip, summary, logSummary, finalize, patchMetadataFile };
}
