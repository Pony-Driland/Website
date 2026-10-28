declare global {
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
}
