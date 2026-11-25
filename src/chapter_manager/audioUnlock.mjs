/**
 * Browsers only allow audio to start after the visitor interacts with the page
 * (autoplay policy). Every sound of the reader is requested by the scroll
 * position, not by the visitor, so the very first playback would be silently
 * dropped by the browser.
 *
 * This module holds those requests until the browser reports a user activation
 * and then runs them in order.
 *
 * Instead of listening to the gesture events, the activation is read from
 * `navigator.userActivation.hasBeenActive`. It is sticky, so a single
 * interaction is enough for the whole session and an interaction that happens
 * before the first sound is requested is not lost.
 *
 * @module chapter_manager/audioUnlock
 */

import TinyUserActivationDetector from 'tiny-essentials/libs/utils/TinyUserActivationDetector';
import { isDev } from '../dev.mjs';

export default new TinyUserActivationDetector({ debugMode: isDev });
