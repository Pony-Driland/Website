// Ambient types shared by the socket client and the AI room UI.

/** A raw, unvalidated payload received from the socket server. */
type SocketPayload = Record<string, unknown>;

/** A listener registered on the underlying socket. */
type SocketListener = (result: SocketPayload) => void;

/** Callback that receives a raw socket payload. */
type SocketPayloadCallback = (result: SocketPayload) => void;

/** Callback invoked when the socket connects. */
type SocketConnectCallback = () => void;

/** Callback invoked when the socket disconnects. */
type SocketDisconnectCallback = (reason: string, details: unknown) => void;

/** Minimal contract of the AI script required by the socket client. */
interface SocketAiScript {
  /** Whether the client is running against a multiplayer server. */
  mpClient: unknown;
}

/** Payload emitted by the local `diceRoll` event. */
interface DiceRollEventData {
  /** Rolled dice. */
  results: DiceRollResult[] | null;
  /** Roll modifiers. */
  modifiers: DiceRollModifier[] | null;
  /** Author of the roll. */
  userId: string | null;
  /** Whether the dice may roll a zero. */
  canZero: boolean | null;
  /** Skin applied to the dice. */
  skin: DiceSkin | null;
  /** Roll id. */
  id: string | null;
  /** Roll date. */
  date: Date | null;
  /** Original expression, when the roll was edited. */
  original?: unknown;
  /** Modifier index, when the roll was edited. */
  index?: unknown;
}

/** Acknowledgement returned by every socket event. */
interface SocketAck {
  error: boolean;
  msg?: string;
  code?: number;
  [key: string]: unknown;
}

/** A user connected to a room. */
interface SocketUserEntry {
  /** Last measured latency in milliseconds. */
  ping?: number;
  /** Display name chosen by the user. */
  nickname?: string | null;
}

/** The account currently signed in. */
interface SocketUser {
  isAdmin?: boolean;
  isMod?: boolean;
  isOwner?: boolean;
  nickname?: string;
  userId?: string;
}

/** A single entry of the room history. */
interface SocketHistoryEntry {
  id?: string;
  text?: string;
  userId?: string;
  chapter?: number;
  date?: number;
  edited?: number;
  isModel?: boolean;
  model?: string;
  tokens?: number;
  hash?: string;
  historyId?: string;
  errorCode?: string | null;
}

/** A dice skin. */
interface DiceSkin {
  img?: string | null;
  border?: string | null;
  bg?: string | null;
  text?: string | null;
  selectionBg?: string | null;
  selectionText?: string | null;
  /** Any other skin field. */
  [key: string]: string | null | undefined;
}

/** Rate limit counters sent by the server. */
interface RatelimitState {
  limit: Record<string, number>;
  size: Record<string, number>;
  dice?: Record<string, number>;
  time?: number | null;
  loadAllHistory?: boolean;
  openRegistration?: boolean;
}

/** Public settings of a room. */
interface RoomState {
  title?: string;
  ownerId?: string;
  maxUsers?: number;
  chapter?: number;
  model?: string | null;
  prompt?: string | null;
  firstDialogue?: string | null;
  systemInstruction?: string | null;
  maxOutputTokens?: number | null;
  temperature?: number | null;
  topP?: number | null;
  topK?: number | null;
  presencePenalty?: number | null;
  frequencyPenalty?: number | null;
  disabled?: boolean;
  readOnly?: boolean;
  /** Any other room field. */
  [key: string]: unknown;
}

/** Free form JSON stored in a room. */
type RoomDataValues = Record<string, unknown>;

/** JSON schema configured for the room RPG data. */
type RpgSchemaValues = Record<string, unknown>;

/** A single dice roll result. */
interface DiceRollResult {
  value: number;
  sides: number;
}

/** A dice roll modifier. */
interface DiceRollModifier {
  index: number;
  expression: string;
  original: string;
}

/** A dice skin file exported by the dice editor. */
interface DiceSkinFile {
  /** Skin values by key. */
  data: Record<string, string>;
  /** Creation timestamp. */
  date?: number;
}

/** Form state of the dice modal. */
interface DiceFormConfig {
  /** Whether the client is connected to a multiplayer server. */
  isOnline: boolean;
  /** Skin values loaded from the server or local storage. */
  data: DiceSkin;
  /** Upload limits applied by the server. */
  rateLimit: Record<string, number>;
}

/** A single die value returned by the server. */
interface DiceRollResult {
  /** Rolled value. */
  value: number;
  /** Amount of sides of the die. */
  sides: number;
}

/** Payload accepted by `createDiceSpecialHtml`. */
interface DiceSpecialData extends DiceHistoryEntry {
  /** Total of the roll. */
  total?: number;
}

/** Payload emitted by the `diceRoll` event. */
interface DiceRollPayload {
  results: DiceRollResult[] | null;
  modifiers: DiceRollModifier[] | null;
  userId: string | null;
  canZero: boolean | null;
  skin: DiceSkin | null;
  id: string | null;
  date: Date | null;
  original?: unknown;
  index?: unknown;
}

/** Filters accepted by the room history search. */
interface HistorySearchQuery {
  /** Free text filter. */
  text: string | null;
  /** Author filter. */
  userId: string | null;
  /** Chapter filter. */
  chapter: number | null;
  /** Amount of items per page. */
  perPage: number | null;
  /** Page number. */
  page: number | null;
  /** Start of the date range. */
  start: number | null;
  /** End of the date range. */
  end: number | null;
}

/** Response of the room history search. */
interface HistorySearchResult {
  /** Whether the request failed. */
  error?: boolean;
  /** Error message. */
  msg?: string;
  /** Error code. */
  code?: string | number;
  /** Messages of the page. */
  messages: SocketHistoryEntry[];
  /** Current page. */
  page?: number;
  /** Total amount of pages. */
  totalPages?: number;
  /** Total amount of items. */
  totalItems?: number;
  /** Whether the request succeeded. */
  success?: boolean;
}

/** Filters accepted by the dice history search. */
interface DiceHistorySearchQuery {
  /** Author filter. */
  userId: string | null;
  /** Amount of items per page. */
  perPage: number | null;
  /** Page number. */
  page: number | null;
  /** Start of the date range. */
  start: number | null;
  /** End of the date range. */
  end: number | null;
}

/** A single entry of the dice history. */
interface DiceHistoryEntry {
  /** Roll id. */
  id?: string;
  /** Author of the roll. */
  userId: string;
  /** Roll date. */
  date?: number | Date;
  /** Rolled dice. */
  results: DiceRollResult[];
  /** Modifiers applied to the roll. */
  modifiers?: DiceRollModifier[];
  /** Whether the dice may roll a zero. */
  canZero?: boolean;
  /** Skin applied to the roll. */
  skin: DiceSkin | null;
}

/** Response of the dice history search. */
interface DiceHistorySearchResult {
  /** Whether the request failed. */
  error?: boolean;
  /** Error message. */
  msg?: string;
  /** Error code. */
  code?: string | number;
  /** Rolls of the page. */
  history: DiceHistoryEntry[];
  /** Current page. */
  page?: number;
  /** Total amount of pages. */
  totalPages?: number;
  /** Total amount of items. */
  totalItems?: number;
}
