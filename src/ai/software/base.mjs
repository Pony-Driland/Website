import { TinyAiInstance } from 'tiny-ai-api';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyAiStorage from './TinyAiStorage.mjs';
import { appData } from '../../important.mjs';

export const tinyIo = { client: null, firstTime: true };

export const tinyAi = new TinyAiInstance();
export const tinyStorage = new TinyAiStorage();

appData.emitter.on('isUsingAI', (usingAI) => {
  if (usingAI) {
    TinyHtml.query('body')?.addClass('is-using-ai');
  } else {
    TinyHtml.query('body')?.removeClass('is-using-ai');
  }
});

///////////////////////////////////////////

export const canSandBox = (value) => value === 'sandBoxFic' || value === 'noData';
