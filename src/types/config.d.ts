// Ambient types describing the static story configuration (`src/chapters/config.mjs`).

/** Keys of {@link StoryConfig} that hold a cryptocurrency wallet. */
type CryptoWalletKey = 'dogecoin' | 'bitcoin' | 'ethereum' | 'bnb' | 'polygon';

/** A single soundtrack entry. */
interface StoryTrack {
  /** YouTube video id or audio file URL. */
  id: string;
  /** Track provider (`youtube` or `audio`). */
  type: string;
  /** Optional track title. */
  title?: string;
  /** Optional track artist. */
  artist?: string;
}

/** A single sound effect entry. */
interface StorySfx {
  /** Source type (`file`). */
  type: string;
  /** Audio module that owns the sound. */
  module: string;
  /** Public path of the audio file. */
  value: string;
  /** Whether the sound loops. */
  loop?: boolean;
}

/** A single character entry. */
interface StoryCharacter {
  /** Markdown file with the character page. */
  path: string;
  /** Public URL of the character page. */
  url: string;
  /** Display title. */
  title?: string;
  /** Short description. */
  description?: string;
}

/** A custom URL entry used by the router. */
interface StoryCustomUrl {
  /** Public URL path. */
  url: string;
  /** Page title. */
  title?: string;
}

/** A cryptocurrency wallet entry. */
interface StoryWallet {
  /** Public wallet address. */
  address: string;
  /** Block explorer URL prefix. */
  explorer: string;
}

/** A single chapter metadata entry. */
interface StoryChapterInfo {
  /** Accent color of the chapter. */
  color: string;
  /** Chapter title. */
  title: string;
  /** Chapter description. */
  description: string;
}

/** A single mature content filter entry. */
interface StoryNsfwEntry {
  /** Weight of the filter. */
  size: number;
  /** Whether the filter is forwarded to the AI prompt. */
  aiMsg: boolean;
  /** Human readable name. */
  name: string;
  /** Long description shown to the reader. */
  description: string;
}

/** A decentralized storage backend (IPFS/Arweave). */
interface StoryStorageBackend {
  /** URL template containing a `{cid}` placeholder. */
  host: string;
  /** Map of public paths to their content id. */
  files: Record<string, string>;
}

/** The NFT domain configuration. */
interface StoryNftDomain {
  /** Display name. */
  name: string;
  /** URL template containing a `{domain}` placeholder. */
  url: string;
  /** Domain used to build the wallet URL. */
  domainWallet: string;
  /** Domain used to build the public URL. */
  valueURL: string;
}

/** Static story configuration. */
interface StoryConfig {
  /** Twitter account data. */
  twitter: { username: string };
  /** Patreon handle. */
  patreon?: string;
  /** Ko-fi handle. */
  kofi?: string;
  /** OpenSea collection slug. */
  opensea?: string;
  /** Dogecoin wallet. */
  dogecoin?: StoryWallet;
  /** Bitcoin wallet. */
  bitcoin?: StoryWallet;
  /** Ethereum wallet. */
  ethereum?: StoryWallet;
  /** BNB Smart Chain wallet. */
  bnb?: StoryWallet;
  /** Polygon wallet. */
  polygon?: StoryWallet;
  /** Mastodon account data. */
  mastodon?: { domain: string; username: string };
  /** Mirror domains of the website. */
  mirror?: string[];
  /** Google Tag Manager id. */
  gtag?: string;
  /** Canonical domain. */
  domain: string;
  /** Amount of items rendered per page. */
  itemsPerPage: number;
  /** Story title. */
  title: string;
  /** Derpibooru tag of the story. */
  derpibooru_tag: string;
  /** Blog URL. */
  blog_url: string;
  /** Discord invite code. */
  discordInvite: string;
  /** Story description. */
  description: string;
  /** Currently loaded page. */
  urlPage: string | null;
  /** Default language. */
  defaultLang: string;
  /** Available languages. */
  lang: string[];
  /** Default YouTube player volume. */
  defaultYoutubeVolume: number;
  /** Year the story started. */
  year: number;
  /** News feeds. */
  news: { rss: string; url: string };
  /** Contact e-mail. */
  contact: string;
  /** Author name. */
  creator: string;
  /** Author page. */
  creator_url: string;
  /** GitHub repository of the website. */
  github: { account: string; repository: string };
  /** Age rating of the story. */
  ageRating: string;
  /** Story tags. */
  tags: string[];
  /** Theme colors. */
  theme: {
    primary: string;
    secondary: string;
    color: string;
    color2: string;
    color3: string;
    color4: string;
  };
  /** Countries that must pass the age verification gate. */
  noNsfw: string[];
  /** Mature content filters. */
  nsfw: Record<string, StoryNsfwEntry>;
  /** Chapter metadata. */
  chapterName: Record<number, StoryChapterInfo>;
  /** Words ignored by the word counter. */
  wordCountBlacklick: string[];
  /** IPFS backend. */
  ipfs: StoryStorageBackend;
  /** Arweave backend. */
  ario: StoryStorageBackend;
  /** NFT domain configuration. */
  nftDomain?: StoryNftDomain;
  /** Amount of chapters. */
  chapters?: number;
  /** Soundtracks per module. */
  playlist?: Record<string, StoryTrack[]>;
  /** Sound effects. */
  sfx?: Record<string, StorySfx>;
  /** Characters. */
  characters?: Record<string, StoryCharacter>;
  /** Custom URLs handled by the router. */
  custom_url?: Record<string, StoryCustomUrl>;
}
