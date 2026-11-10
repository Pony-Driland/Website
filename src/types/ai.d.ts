// Ambient types shared by the AI page and its content enabler.

/**
 * Range + number input pair created by `tinyRanger()` in `aiSoftware.mjs`.
 *
 * Every setter returns the control itself so the calls can be chained.
 */
interface TinyRanger {
  /** Returns the `<input type="range">` element. */
  getBase: () => TinyHtmlAny;
  /** Returns the `<input type="number">` element. */
  getBase2: () => TinyHtmlAny;
  /** Triggers an event on the range input. */
  trigger: (value: string) => TinyHtmlAny;
  /** Resets the control to its empty state. */
  reset: () => TinyRanger;
  /** Sets the minimum value. */
  setMin: (value: number) => TinyRanger;
  /** Sets the maximum value. */
  setMax: (value: number) => TinyRanger;
  /** Sets the step value. */
  setStep: (value: number) => TinyRanger;
  /** Disables both inputs. */
  disable: () => TinyRanger;
  /** Enables both inputs. */
  enable: () => TinyRanger;
  /** Returns the wrapper element. */
  insert: () => TinyHtmlAny;
  /**
   * Gets or sets the current value.
   *
   * Returns the numeric value when called without arguments, and the control
   * itself when a value is given, so the calls can be chained.
   */
  val: (value?: number) => any;
  /** Returns the current value as a string. */
  valString: () => string;
  /** Returns the current number input value as a string. */
  valString2: () => string;
}

/**
 * Token counters of a serialized AI session.
 */
interface AiSessionTokens {
  /** Token counters of the messages. */
  data?: TinyAiTokenData[];
  /** Tokens of the system instruction. */
  systemInstruction?: number;
  /** Tokens of the prompt. */
  prompt?: number;
  /** Tokens of the first dialogue. */
  firstDialogue?: number;
  /** Tokens of the attached file. */
  file?: number;
  /** Any other token counter. */
  [key: string]: number | TinyAiTokenData[] | undefined;
}

/**
 * Serialized AI session, as stored in the local database and in the backup files.
 */
interface AiSessionFile {
  /** Session id. */
  id?: string;
  /** Selected model. */
  model?: string | null;
  /** Prompt. */
  prompt?: string | null;
  /** First dialogue. */
  firstDialogue?: string | null;
  /** System instruction. */
  systemInstruction?: string | null;
  /** Max output tokens. */
  maxOutputTokens?: number | null;
  /** Temperature. */
  temperature?: number | null;
  /** Top-P. */
  topP?: number | null;
  /** Top-K. */
  topK?: number | null;
  /** Presence penalty. */
  presencePenalty?: number | null;
  /** Frequency penalty. */
  frequencyPenalty?: number | null;
  /** RPG schema. */
  rpgSchema?: Record<string, unknown> | null;
  /** RPG data. */
  rpgData?: Record<string, unknown> | null;
  /** Private RPG data. */
  rpgPrivateData?: Record<string, unknown> | null;
  /** Message list. */
  data?: TinyAiSessionMessage[];
  /** Message ids. */
  ids?: (number | null)[];
  /** Token counters. */
  tokens?: AiSessionTokens;
  /** Message hashes. */
  hash?: Record<string, string | null>;
  /** Custom value list. */
  customList?: { name: string; type: string }[];
  /** Any other field. */
  [key: string]: unknown;
}

/** Token usage reported by the provider for a single request. */
interface AiTokenUsage {
  /** Amount of tokens of each section. */
  count: {
    /** Tokens of the generated candidates. */
    candidates?: number | null;
    /** Tokens of the prompt. */
    prompt?: number | null;
    /** Total amount of tokens. */
    total?: number | null;
  };
}

/** Cached state of a rendered chat message. */
interface AiMessageCache {
  /** Chapter of the message. */
  chapter?: string | number | null;
  /** Provider message id. */
  msgId?: number | string | null;
  /** Last edit date. */
  edited?: string | number | null;
  /** Creation date. */
  date?: string | number | null;
  /** Message text. */
  msg?: string | null;
  /** Author role. */
  role: string;
  /** Amount of tokens. */
  tokens?: number | null;
  /** Local message id. */
  dataid?: number | string | null;
  /** Re-renders the message body. */
  updateText: (text?: string) => void;
  /** Deletes the message. */
  delete: () => void;
  /** Removes the message from the chat. */
  remove: () => void;
  /** Refreshes the message attributes. */
  update: () => void;
}

/** Cached state of the balloon of the message being generated. */
interface AiBalloonCache {
  /** Rendered balloon element. */
  msgBallon?: TinyHtmlAny;
  /** Local id of the message. */
  msgId?: number;
  /** Cancels the running generation. */
  cancel?: () => void;
  /** Cached message data. */
  cache?: Record<string, unknown>;
}

/**
 * Hashes of the cached sections of a session, used to know which token
 * counters must be recomputed.
 */
interface AiHashItems {
  /** Hash of each message. */
  data?: (string | null)[];
  /** Hash of the selected model. */
  model?: string | null;
  /** Hash of the RPG schema. */
  rpgSchema?: string | null;
  /** Hash of the public RPG data. */
  rpgData?: string | null;
  /** Hash of the private RPG data. */
  rpgPrivateData?: string | null;
  /** Hash of the prompt. */
  prompt?: string | null;
  /** Hash of the attached file. */
  file?: string | null;
  /** Hash of the system instruction. */
  systemInstruction?: string | null;
  /** Any other section hash. */
  [key: string]: string | (string | null)[] | null | undefined;
}

/**
 * Token counter widget of the AI sidebar.
 */
interface TokenCount {
  /** Amount of tokens used by the current request. */
  amount: TinyHtmlAny;
  /** Total amount of tokens of the model context. */
  total: TinyHtmlAny;
  /** Updates one of the counters. */
  updateValue: (where: string, value: number) => TinyHtmlAny | void;
  /** Reads one of the counters. */
  getValue: (where: string) => number | void;
  /** Any other counter. */
  [key: string]: unknown;
}

/**
 * Prompt builder functions of the AI template library.
 */
interface AiTemplateFuncs {
  /** Warns the model about the maximum output length. */
  maxTokensWarn: (maxOutputTokens: number, isTextContinue?: boolean) => string;
  /** Explains how a marker is written in the story. */
  ficTimeCheckerStart: (where: string, howMake: string) => string;
  /** Asks the model to keep the marker in natural language. */
  ficTimeCheckerFix: (where: string) => string;
  /** Replaces the `{{char}}`, `{{char-data}}` and `{{user}}` placeholders. */
  convertToCharacter: (text: string, config?: AiCharacterConfig) => string;
  /** Builds the character impersonation prompt. */
  aiCharMode: (charName: string, pronoum: string) => string;
  /** Builds the default RPG schema. */
  jsonTemplate: () => Record<string, unknown>;
  /** Any other prompt builder. */
  [key: string]: ((...args: never[]) => unknown) | undefined;
}

/**
 * A single entry of the prompt/template picker used by the AI page.
 *
 * Every field is optional because the list mixes real prompts, section
 * headers and horizontal rules.
 */
interface AiPromptTemplate {
  /** Label shown in the picker. */
  name?: string;
  /** Value stored in the `<option>`. */
  value?: string;
  /** Text inserted when the entry is an instruction. */
  instructionText?: string;
  /** Text inserted when the entry is a regular prompt. */
  text?: string;
  /** Text inserted into the sandbox editor. */
  sandBoxText?: string;
  /** First dialogue inserted by the entry. */
  firstDialogue?: string;
  /** Turns the entry into a section header. */
  disabled?: boolean;
  /** Turns the entry into a horizontal rule. */
  hr?: boolean;
  /** Kind of the entry (`text` or `instructionText`). */
  type?: string;
  /** Hides the entry outside of the sandbox mode. */
  sandboxOnly?: boolean;
  /** Hides the entry when the safe mode is active. */
  isNotSafe?: boolean;
  /** Preset temperature applied by the entry. */
  temperature?: number;
  /** Preset max output tokens applied by the entry. */
  maxOutputTokens?: number;
  /** Preset top-P applied by the entry. */
  topP?: number;
  /** Preset top-K applied by the entry. */
  topK?: number;
  /** Preset presence penalty applied by the entry. */
  presencePenalty?: number;
  /** Preset frequency penalty applied by the entry. */
  frequencyPenalty?: number;
  /** Any other field read dynamically by the picker. */
  [key: string]: unknown;
}

/** Predicate that tells whether a control must be locked. */
type ValidateMultiplayerFn = (
  value: boolean,
  needAi?: boolean,
  allowMulti?: boolean,
  isInverse?: boolean,
) => boolean;

/**
 * Payload of a single message part.
 *
 * The provider types every part as
 * `Record<"text" | "inlineData", string | { mime_type, data } | null>`, so both
 * keys have to accept the very same union.
 */
type TinyAiPartContent = string | { mime_type: string; data: string } | null;

/**
 * A single part of an AI message.
 *
 * Mirrors the provider type, which declares both keys as required, so the
 * messages built here can be handed back to `tiny-ai-api`.
 */
type TinyAiMessagePart = Record<'text' | 'inlineData', TinyAiPartContent>;

/** A single entry of the AI session history. */
interface TinyAiSessionMessage {
  /** Message parts. */
  parts: TinyAiMessagePart[];
  /** Author role. */
  role?: string;
  /** Reason the model stopped generating. */
  finishReason?: string | number;
  /** Any other provider field. */
  [key: string]: unknown;
}

/** Token counter attached to a single message. */
interface TinyAiTokenData {
  /** Amount of tokens, or `null` when unknown. */
  count: number | null;
  /** Whether the counter must be hidden. */
  hide?: boolean;
  /** Message id this counter belongs to. */
  msgId?: number;
}

/** A model returned by the provider. */
interface TinyAiModel {
  /** Model id used by the API. */
  id: string | null;
  /** Human readable name. */
  displayName: string | null;
  /** Category the model belongs to, when it is a group. */
  category?: string | null;
  /** Models of a category. */
  data?: TinyAiModel[] | null;
  /** Maximum amount of tokens accepted by the model context. */
  inputTokenLimit?: number | null;
  /** Maximum amount of tokens the model can output. */
  outputTokenLimit?: number | null;
  /** Maximum temperature accepted by the model. */
  maxTemperature?: number | null;
  /** Default temperature of the model. */
  temperature?: number | null;
  /** Default top-P of the model. */
  topP?: number | null;
  /** Default top-K of the model. */
  topK?: number | null;
  /** Default presence penalty of the model. */
  presencePenalty?: number | null;
  /** Default frequency penalty of the model. */
  frequencyPenalty?: number | null;
  /** Any other provider field. */
  [key: string]: unknown;
}

/** Full session payload returned by `getData()`. */
interface TinyAiSessionData {
  /** Messages of the session. */
  data: TinyAiSessionMessage[];
  /** Message ids. */
  ids: number[];
  /** Token counters. */
  tokens: { data: TinyAiTokenData[]; [key: string]: unknown };
  /** Message hashes. */
  hash: { data: string[]; [key: string]: unknown };
  /** System instruction. */
  systemInstruction: string | null;
  /** Custom value list. */
  customList?: { name: string; type: string }[];
  /** Selected model. */
  model: string | null;
  /** Prompt of the session. */
  prompt?: string | null;
  /** First dialogue of the session. */
  firstDialogue?: string | null;
  /** Attached file. */
  file?: { mime: string; base64: string } | null;
  /** RPG schema. */
  rpgSchema?: Record<string, unknown> | null;
  /** Public RPG data. */
  rpgData?: Record<string, unknown> | null;
  /** Private RPG data. */
  rpgPrivateData?: Record<string, unknown> | null;
  /** Max output tokens. */
  maxOutputTokens?: number | null;
  /** Temperature. */
  temperature?: number | null;
  /** Top-P. */
  topP?: number | null;
  /** Top-K. */
  topK?: number | null;
  /** Presence penalty. */
  presencePenalty?: number | null;
  /** Frequency penalty. */
  frequencyPenalty?: number | null;
  /** Any other provider field. */
  [key: string]: unknown;
}

/** Chunk emitted by `genContent()` while the answer is being streamed. */
interface TinyAiStreamChunk {
  /** Whether the generation is complete. */
  done?: boolean;
  /** Token usage reported so far. */
  tokenUsage?: AiTokenUsage;
  /** Contents generated so far. */
  contents?: TinyAiSessionMessage[];
}

/** Result of `genContent()`. */
interface TinyAiGenResult {
  /** Error reported by the provider. */
  error?: { message?: string } | null;
  /** Token usage of the request. */
  tokenUsage?: AiTokenUsage;
  /** Generated contents. */
  contents?: TinyAiSessionMessage[];
  /** Any other provider field. */
  [key: string]: unknown;
}

/**
 * Runtime contract of the `tiny-ai-api` instance used by the AI page.
 *
 * The published `exports` map has no `types` condition, so TypeScript cannot
 * resolve the shipped declarations. This interface mirrors the subset of the
 * runtime API that this project actually uses.
 */
interface TinyAiClient {
  /** Whether the AI is disabled for the current session. */
  noai: boolean;
  /** Pagination token returned by the last `getModels()` call. */
  _nextModelsPageToken: string | null;

  /** Registers an event listener. */
  on(event: string, listener: (...args: never[]) => void): this;
  /** Removes every listener. */
  removeAllListeners(event?: string): this;

  /** Selects the active session. */
  selectDataId(id: string | null): boolean;
  /** Starts (or creates) a session. */
  startDataId(id: string, selected?: boolean): TinyAiSessionMessage[];
  /** Resets the current session. */
  resetContentData(id?: string): number;

  /** Stores a custom value. */
  setCustomValue(name: string, value: unknown, tokenAmount?: number, id?: string): void;
  /** Reads a custom value. */
  getCustomValue(name: string, id?: string): unknown;

  /** Sets the max output tokens. */
  setMaxOutputTokens(value: number, id?: string): void;
  /** Reads the max output tokens. */
  getMaxOutputTokens(id?: string): number | null;
  /** Sets the temperature. */
  setTemperature(value: number, id?: string): void;
  /** Reads the temperature. */
  getTemperature(id?: string): number | null;
  /** Sets the top-P. */
  setTopP(value: number, id?: string): void;
  /** Reads the top-P. */
  getTopP(id?: string): number | null;
  /** Sets the top-K. */
  setTopK(value: number, id?: string): void;
  /** Reads the top-K. */
  getTopK(id?: string): number | null;
  /** Sets the presence penalty. */
  setPresencePenalty(value: number, id?: string): void;
  /** Reads the presence penalty. */
  getPresencePenalty(id?: string): number | null;
  /** Sets the frequency penalty. */
  setFrequencyPenalty(value: number, id?: string): void;
  /** Reads the frequency penalty. */
  getFrequencyPenalty(id?: string): number | null;

  /** Selects the active model. */
  setModel(data: string, id?: string | null): void;
  /** Returns the active model. */
  getModel(id?: string): string | null;
  /** Lists the available models. */
  getModels(pageSize?: number, pageToken?: string | null): TinyAiModel[];
  /** Lists the available models grouped by category. */
  getModelsList(): TinyAiModel[];
  /** Returns the metadata of a single model. */
  getModelData(id: string): TinyAiModel | null;

  /** Builds the content list sent to the provider. */
  buildContents(
    contents?: unknown[] | null,
    item?: Record<string, unknown>,
    role?: string | null,
    rmFinishReason?: boolean,
  ): Record<string, unknown>;
  /** Counts the tokens of a payload. */
  countTokens(
    data: unknown,
    model?: string | null,
    controller?: AbortController,
  ): Promise<{ totalTokens?: number }>;
  /** Returns the human readable error for a code. */
  getErrorCode(code: string | number): { text: string; hide?: boolean } | null;
  /** Generates content. */
  genContent(
    data: unknown,
    model?: string | null,
    controller?: AbortController,
    streamCallback?: (chunk: TinyAiStreamChunk) => void,
  ): Promise<TinyAiGenResult>;

  /** Returns the active session id. */
  getId(id?: string): string | null;
  /** Returns the full session payload. */
  getData(id?: string): TinyAiSessionData | null;
  /** Returns the total amount of tokens. */
  getTotalTokens(id?: string): number | null;

  /** Returns the tokens of a message by index. */
  getMsgTokensByIndex(msgIndex: number, id?: string): TinyAiTokenData | null;
  /** Returns the tokens of a message by id. */
  getMsgTokensById(msgId: number, id?: string): TinyAiTokenData | null;
  /** Returns the hash of a message by index. */
  getMsgHashByIndex(msgIndex: number, id?: string): string | null;
  /** Returns the hash of a message by id. */
  getMsgHashById(msgId: number, id?: string): string | null;
  /** Returns a message by index. */
  getMsgByIndex(index: number, id?: string): TinyAiSessionMessage | null;
  /** Returns a message by id. */
  getMsgById(msgId?: number, id?: string): TinyAiSessionMessage | null;
  /** Returns the index of a message id. */
  getIndexOfId(msgId: number, id?: string): number;
  /** Returns the id of a message index. */
  getIdByIndex(index: number, id?: string): string | number;
  /** Deletes a message by index. */
  deleteIndex(index: number, id?: string): boolean;
  /** Replaces a message by index. */
  replaceIndex(index: number, data?: TinyAiSessionMessage | null, tokens?: TinyAiTokenData): void;
  /** Returns the last message. */
  getLastIndexData(id?: string): TinyAiSessionMessage | null;
  /** Returns the first message. */
  getFirstIndexData(id?: string): TinyAiSessionMessage | null;
  /** Appends a message. */
  addData(
    data: TinyAiSessionMessage | Record<string, unknown>,
    tokens?: TinyAiTokenData,
    id?: string,
  ): number;

  /** Sets the prompt. */
  setPrompt(promptData?: string | null, tokenAmount?: number, id?: string): void;
  /** Returns the prompt. */
  getPrompt(id?: string): string | null;
  /** Sets the first dialogue. */
  setFirstDialogue(dialogue?: string | null, tokenAmount?: number, id?: string): void;
  /** Returns the first dialogue. */
  getFirstDialogue(id?: string): string | null;
  /** Sets the attached file. */
  setFileData(
    mime?: string | null,
    data?: string | null,
    isBase64?: boolean | null,
    tokenAmount?: number,
    id?: string,
  ): void;
  /** Removes the attached file. */
  removeFileData(id?: string): void;
  /** Sets the system instruction. */
  setSystemInstruction(data?: string | null, tokenAmount?: number, id?: string): void;
  /** Returns the system instruction. */
  getSystemInstruction(id?: string): string | null;

  /** Returns the amount of tokens of a section. */
  getTokens(where: string, id?: string): number | null;
  /** Returns the hash of a section. */
  getHash(where: string, id?: string): string | null;
}

/**
 * Placeholder values replaced by `AiTemplateFuncs.convertToCharacter`.
 */
interface AiCharacterConfig {
  /** Value of the `{{char}}` placeholder. */
  name?: string | null;
  /** Value of the `{{char-data}}` placeholder. */
  data?: string | null;
  /** Value of the `{{user}}` placeholder. */
  user?: string | null;
}

/**
 * Prompt library shared by the AI page.
 */
interface AiTemplates {
  /** Prompt builder functions. */
  funcs: AiTemplateFuncs;
  /** System instructions by key. */
  instructions: Record<string, string>;
  /** Helper snippets by key. */
  helpers: Record<string, string>;
  /** Prompt picker entries. */
  prompts: AiPromptTemplate[];
}

/** Credential stored for a single AI provider. */
interface AiCredential {
  /** API key of the provider. */
  key?: string | null;
  /** Server ip. */
  ip?: string;
  /** Server username. */
  username?: string;
  /** Server password. */
  password?: string;
  /** Room id. */
  roomId?: string;
  /** Room password. */
  roomPassword?: string;
}

/** Rendered form of a single AI provider. */
interface AiProviderForm {
  /** Rendered inputs. */
  input: TinyHtmlAny[];
  /** Optional description block. */
  desc?: TinyHtmlAny;
  /** Optional submit button. */
  submit?: TinyHtmlAny;
}

/** Provider entry of the AI picker. */
interface AiProviderEntry {
  /** Builds the provider form. */
  inputs?: () => AiProviderForm;
}

/** A single node of a JSON Editor schema. */
interface JsonSchemaNode {
  /** Field title. */
  title?: string;
  /** Field description. */
  description?: string;
  /** Field type. */
  type?: string;
  /** Field id. */
  id?: string;
  /** Field format. */
  format?: string;
  /** Object properties. */
  properties?: Record<string, JsonSchemaNode>;
  /** Array items. */
  items?: JsonSchemaNode;
  /** Editor options. */
  options?: Record<string, unknown>;
  /** Header template. */
  headerTemplate?: string;
  /** Any other JSON Editor field. */
  [key: string]: unknown;
}

/** Data of a single chat message rendered by `makeMessage()`. */
interface AiChatMessageData {
  /** Rendered message. */
  message?: string | null;
  /** Message id inside the local database. */
  id?: number | string | null;
  /** Creation date. */
  date?: string | number | null;
  /** Provider message id. */
  msgId?: number | string | null;
  /** Chapter the message belongs to. */
  chapter?: string | number | null;
  /** Last edit date. */
  edited?: string | number | null;
  /** Amount of tokens of the message. */
  tokens?: number | null;
}

/** Configuration accepted by the character list generator. */
interface JsonCharacterListConfig {
  /** Section title. */
  title: string;
  /** Section description. */
  description: string;
  /** Section id. */
  id: string;
  /** Title of each item. */
  itemTitle: string;
  /** Id of each item. */
  itemID: string;
  /** Whether the mascot list must be included. */
  mascot?: boolean;
}
