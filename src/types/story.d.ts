// Ambient types describing the fic (chapters, lines and pagination).

type TinyHtmlAny = import('tiny-essentials/libs/html/TinyHtml').TinyHtmlAny;

/** A single character entry collected while loading the chapters. */
interface StoryCharacterEntry {
  /** Display name. */
  value: string;
  /** Slug used in the DOM. */
  id: string;
  /** Total number of lines. */
  count: number;
  /** Lines per chapter. */
  chapter: Record<string | number, number>;
}

/** A single word entry collected while loading the chapters. */
interface StoryWordEntry {
  /** The word. */
  value: string;
  /** Number of occurrences. */
  count: number;
}

/** Scene state applied by a line. */
interface FicPageSet {
  /** Sound effect to play. */
  playEffect?: ChapterSoundConfig;
  /** Soundtrack playlist key. */
  playlistPlay?: string;
  /** Day number. */
  day?: number;
  /** Day/night cycle key. */
  dayNightCycle?: string;
  /** Weather key. */
  weather?: string;
  /**
   * Pins the moon phase for the current night.
   *
   * Use `auto` (or omit the key) to fall back to the automatic phase of the
   * day/night cycle. The value only applies to the night it was declared on.
   */
  moonPhase?: string;
  /** Location name. */
  where?: string;
}

/** A single line of the fic, as stored in the chapter JSON files. */
interface FicPageLine {
  /** Line type. */
  type?: 'action' | 'dialogue' | 'telepathy' | 'think';
  /** Visible text. */
  value?: string;
  /** Text shown when the mature filter is active. */
  value_alternative?: string;
  /** Character that owns the line. */
  character?: string;
  /** Whether the line belongs to a flashback scene. */
  flashback?: boolean;
  /** Mature content flags required to reveal the line. */
  nsfw?: string[];
  /** Scene state applied by this line. */
  set?: FicPageSet;
  /** Day number of the scene. */
  day?: number;
  /** Day/night cycle of the scene. */
  dayNightCycle?: string;
  /** Weather of the scene. */
  weather?: string;
  /** Location of the scene. */
  where?: string;
  /** Extra curiosities attached to the line. */
  info?: Record<string, string>;
}

/** A line already filtered and paired with its chapter position. */
interface FicPageEntry {
  /** Line payload. */
  content: FicPageLine;
  /** 1-based line number. */
  line: number;
}

/** Pizzicato wrapper attached to a sound effect instance. */
interface SfxPizzicato {
  /** Fades the sound out. */
  hide?: (hideTimeout?: number) => void;
  /** Fades the sound in. */
  show?: (hideTimeout?: number) => void;
}

/**
 * A single sound effect instance managed by the music manager.
 *
 * The music manager decorates each entry at runtime with the player API of the
 * backend currently in use (SeamlessLoop, Pizzicato or a plain audio element),
 * so the shape is intentionally open.
 */
interface SfxInstance {
  /** Whether the sound is currently playing. */
  playing: boolean;
  /** Whether the sound is paused. */
  paused: boolean;
  /** Whether the sound is fading out. */
  hiding: boolean;
  /** Whether the sound is fading in. */
  showing: boolean;
  /** Whether the sound loops. */
  loop: boolean;
  /** Decoded audio file. */
  file: HTMLAudioElement;
  /** Current playback position, in seconds. */
  currentTime: number;
  /** Total duration, in seconds. */
  duration: number;
  /** Remaining time, in seconds. */
  leftTime: number;
  /** Current volume, from 0 to 100. */
  volume: number;
  /** Pizzicato sound backing the instance. */
  pizzicato: SfxPizzicato;
  /** Underlying player (SeamlessLoop or Pizzicato sound). */
  data: unknown;
  /** Stops the sound. */
  stop: () => void;
  /** Starts the sound. */
  start: () => void;
  /** Pauses the sound. */
  pause: () => void;
  /** Resumes the sound. */
  resume: () => void;
  /** Fades the sound in. */
  show: (hideTimeout?: number) => Promise<unknown>;
  /** Fades the sound out. */
  hide: (hideTimeout?: number) => Promise<unknown>;
  /** Plays the sound. */
  play: (volume?: number | null) => Promise<unknown>;
  /** Sets the volume, from 0 to 100. */
  setVolume: (value?: number | null, notEdit?: boolean) => Promise<unknown>;
  /** Seeks to the given second. */
  seekTo: (value: number) => void;
}

/** Sound effects indexed by their config key. */
type SfxCollection = Record<string, SfxInstance>;

/** A chapter of the fic, indexed by its 1-based line number. */
type StoryChapterData = Record<string | number, FicPageLine>;

/** Navigation entries rendered in the navbar while reading. */
interface StoryNavItems {
  /** Bookmark entry. */
  bookmark?: TinyHtmlAny;
  /** Day entry. */
  day?: TinyHtmlAny;
  /** Day/night cycle entry. */
  dayNightCycle?: TinyHtmlAny;
  /** Weather entry. */
  weather?: TinyHtmlAny;
  /** Location entry. */
  where?: TinyHtmlAny;
  /** Music player entry. */
  music?: TinyHtmlAny;
  /** Text-to-speech play button. */
  play?: TinyHtmlAny;
  /** Text-to-speech stop button. */
  stop?: TinyHtmlAny;
  /** Text-to-speech toggle. */
  tts?: TinyHtmlAny;
}

/** Navbar containers, one per breakpoint. */
interface StoryNavbar {
  /** Desktop containers. */
  base: { left: TinyHtmlAny; right: TinyHtmlAny };
  /** Mobile containers. */
  item: { left: TinyHtmlAny; right: TinyHtmlAny };
}

/** Loaded story data and bootstrap helper. */
interface StoryData {
  /** Story title. */
  title: string;
  /** Story description. */
  description: string;
  /** Amount of loaded chapters. */
  count?: number;
  /** Available languages. */
  lang: { active: string; default: string; list: string[] };
  /** Whether the reader is open. */
  readFic: boolean;
  /** Reader state. */
  chapter: {
    /** Amount of chapters. */
    amount: number;
    /** Selected chapter. */
    selected: number;
    /** Bookmark of each chapter. */
    bookmark: Record<string | number, number>;
    /** Prevents the reading position from being persisted. */
    blockLineSave?: boolean;
    /** Currently selected line. */
    line?: number;
    /** Current weather. */
    weather?: string;
    /** Weather of the next line. */
    nextWeather?: string;
    /** Moon phase pinned by the story for the current night. */
    nextMoonPhase?: string | null;
    /** Precipitation motion overrides pinned by the story. */
    nextWeatherConfig?: { wind?: number; speed?: number } | null;
    /** Day/night cycle of the next line. */
    nextDayNightCycle?: string;
    /** Rendered lines, indexed by line number. */
    html: Record<string | number, TinyHtmlAny>;
    /** Lines visible with the current filters. */
    ficPageData: FicPageEntry[];
    /** Navbar entries. */
    nav: StoryNavItems;
  };
  /** Chapter payloads. */
  data: Record<string | number, StoryChapterData>;
  /** Amount of letters per chapter. */
  lettersCount: Record<string | number, number>;
  /** Amount of words per chapter. */
  wordsCount: Record<string | number, number>;
  /** Character statistics. */
  characters: { data: StoryCharacterEntry[]; total: number };
  /** Word statistics. */
  words: StoryWordEntry[];
  /** Whether each chapter is new (2), updated (1) or unchanged (0). */
  isNew: Record<string | number, number>;
  /** Highest `isNew` value across the chapters. */
  globalIsNew: number;
  /** Readme HTML. */
  readme?: string;
  /** Currently loaded page. */
  urlPage?: string;
  /** IPFS content id of the current deployment. */
  cid?: string;
  /** IPFS content id of the current deployment (legacy alias). */
  cid32?: string;
  /** Navbar containers. */
  nc: StoryNavbar;
  /** Text-to-speech manager. */
  tts: { enabled: boolean; nav?: StoryNavItems };
  /** Sound effects. */
  sfx: SfxCollection;
  /** Boots the story. */
  start?: (
    startApp: (done: () => void, readme: string) => void,
    failApp?: (err: Error) => void,
  ) => Promise<void>;
}

/** Sound effect configuration attached to a fic line. */
interface ChapterSoundConfig {
  /** Public path of the audio file. */
  file: string;
  /** Whether the sound must be playing. */
  enabled: boolean;
  /** Whether the sound must start immediately. */
  instant?: boolean;
}

/** `window` extended with the injected Web3 provider. */
interface WindowWithEthereum extends Window {
  /** Injected EIP-1193 provider. */
  ethereum?: unknown;
}

/** Entries of the main navbar. */
interface NavbarItems {
  /** Dropdown data by key. */
  dbBase: Record<string, NavbarDropdownItem[]>;
  /** Dropdown elements by key. */
  dropdowns?: Record<string, TinyHtmlAny>;
  /** Left side items. */
  left?: (TinyHtmlAny | null)[];
  /** Right side items. */
  right?: (TinyHtmlAny | null)[];
  /** Registers the offcanvas instance. */
  setOffCanvas?: (offCanvas: import('bootstrap').Offcanvas) => void;
}

/** A single navbar dropdown entry. */
interface NavbarDropdownItem {
  /** Target url. */
  href?: string;
  /** Element id. */
  id?: string;
  /** Visible label. */
  text: string;
  /** Font Awesome icon class. */
  icon?: string;
  /** Markdown file opened on click. */
  file?: string;
  /** Marks the entry as web3 only. */
  web3Element?: boolean;
  /** Click handler. */
  click?: (e: Event) => void;
}

/** Login entry rendered in the navbar when the age gate is active. */
interface NavbarLoginAccount {
  /** List item that wraps the login button. */
  base?: TinyHtmlAny;
  /** Login/logout button. */
  link?: TinyHtmlAny;
  /** Icon displayed inside the button. */
  icon?: TinyHtmlAny & { iconTags?: string[] };
}
