import { TinyAiInstance } from 'tiny-ai-api';
import TinyAiStorage from './TinyAiStorage.mjs';
import { appData } from '../../important.mjs';
import { body } from '../../html/query.mjs';
import TinyClientIo from '../socketClient.mjs';

/**
 * Holds the optional socket client used by the multiplayer mode.
 *
 * @typedef {Object} TinyIo
 * @property {null|TinyClientIo} client - Active socket client, or `null` when offline.
 * @property {boolean} firstTime - Whether the socket client still has to be bootstrapped.
 */

/** @type {TinyIo} */
export const tinyIo = { client: null, firstTime: true };

/** Shared `tiny-ai-api` instance used by every AI screen. */
export const tinyAi = new TinyAiInstance();

/** Persists the provider credentials and the selected provider. */
export const tinyStorage = new TinyAiStorage();

appData.emitter.on('isUsingAI', (usingAI) => {
  if (usingAI) {
    body.addClass('is-using-ai');
  } else {
    body.removeClass('is-using-ai');
  }
});

///////////////////////////////////////////

/**
 * Tells whether a session id belongs to a sandbox-like preset, which is allowed
 * to have its system instruction freely edited.
 *
 * @param {unknown} value - Session id to test.
 * @returns {boolean} `true` for the `sandBoxFic` and `noData` presets.
 */
export const canSandBox = (value) => value === 'sandBoxFic' || value === 'noData';
