import { TinyAiInstance } from 'tiny-ai-api';
import TinyAiStorage from './TinyAiStorage.mjs';
import { appData } from '../../important.mjs';
import { body } from '../../html/query.mjs';
import TinyClientIo from '../socketClient.mjs';

/**
 * @typedef {Object} TinyIo
 * @property {null|TinyClientIo} client
 * @property {boolean} firstTime
 */

/** @type {TinyIo} */
export const tinyIo = { client: null, firstTime: true };

export const tinyAi = new TinyAiInstance();
export const tinyStorage = new TinyAiStorage();

appData.emitter.on('isUsingAI', (usingAI) => {
  if (usingAI) {
    body.addClass('is-using-ai');
  } else {
    body.removeClass('is-using-ai');
  }
});

///////////////////////////////////////////

export const canSandBox = (value) => value === 'sandBoxFic' || value === 'noData';
