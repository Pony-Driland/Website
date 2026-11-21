declare module 'pizzicato' {
  export interface SoundOptions {
    source?: string;
    options?: Record<string, unknown>;
  }

  export class Sound {
    constructor(source?: string | SoundOptions, onReady?: (error?: Error | null) => void);
    play(): void;
    stop(): void;
    pause(): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    [key: string]: unknown;
  }

  const Pizzicato: {
    Sound: typeof Sound;
    [key: string]: unknown;
  };

  export default Pizzicato;
}
