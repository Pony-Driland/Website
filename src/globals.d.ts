// Ambient declarations for globals injected by third-party scripts at runtime.

import type { formatCustomTimer } from 'tiny-essentials/basics/clock';

interface SongAlternativeFile {
  category?: string | string[];
  generators_used?: string[];
  file: string[];
}

interface SongProductionStep {
  id: string;
  weirdness?: number;
  style_influence?: number;
  audio_influence?: number;
  max_mode: boolean;
  instrument_prompt: string;
  instrument_negative_prompt?: string;
}

interface SongTrackMetadata {
  file: string | string[];
  format?: string[];
  category?: string | string[];
  generators_used?: string[];
  bpm?: number[];
  suno_start?: string;
  alternative_files?: SongAlternativeFile[];
  production_steps?: SongProductionStep[];
  creation_date: number;
  reference_songs?: string[];
}

type FormatCustomTimer = typeof formatCustomTimer;

declare global {
  /** YouTube IFrame Player API namespace, injected by `https://www.youtube.com/iframe_api`. */
  const YT: YoutubeIframeApi;

  /** jQuery, provided by legacy third-party bundles. */
  const jQuery: unknown;

  interface Window {
    /** Converts Earth minutes into Pony Driland minutes. */
    earthTimeToPony: (earthMinutes: number) => number;
    /** Converts Pony Driland minutes into Earth minutes. */
    ponyTimeToEarth: (ponyMinutes: number) => number;
    /** Formats a duration using the tiny-essentials clock helper. */
    formatCustomTimer: FormatCustomTimer;
    /** Google Tag Manager data layer. */
    dataLayer: unknown[];
    /** YouTube IFrame API namespace, injected by the YouTube iframe script. */
    YT: YoutubeIframeApi;
    /** Callback invoked by the YouTube IFrame API once it is ready. */
    onYouTubeIframeAPIReady?: () => void;
    /** Socket.IO client instance exposed for debugging. */
    tinyIo: unknown;
    /** Tiny AI client instance exposed for debugging. */
    tinyAi: unknown;
  }
}
