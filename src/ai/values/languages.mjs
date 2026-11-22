import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';

/**
 * Languages that can be attached to a room.
 *
 * The `code` is the ISO 639-1 code (optionally with an ISO 3166-1 region or a
 * UN M.49 area) stored in the database, so it must stay in sync with
 * `normalizeRoomLanguage()` on the server. `flag` is only a visual hint and
 * `label` is the name shown on the room settings and on the filter.
 *
 * @typedef {Object} RoomLanguage
 * @property {string} code - ISO 639-1 code (empty for "any language").
 * @property {string} label - Human readable name.
 * @property {string} flag - Emoji flag used on the badges.
 */

/**
 * @typedef {Object} RoomLanguageGroup
 * @property {string} label - Group name, rendered as an `<optgroup>` label.
 * @property {RoomLanguage[]} languages - Languages of the group.
 */

/**
 * Every language available on the room settings and on the room browser.
 *
 * The list is grouped by language family so the `<select>` stays usable, but
 * the value stored in the database is always the plain `code`.
 *
 * @type {RoomLanguageGroup[]}
 */
export const ROOM_LANGUAGE_GROUPS = [
  {
    label: 'English',
    languages: [
      { code: 'en', label: 'English', flag: '🇬🇧' },
      { code: 'en-us', label: 'English (United States)', flag: '🇺🇸' },
      { code: 'en-gb', label: 'English (United Kingdom)', flag: '🇬🇧' },
      { code: 'en-au', label: 'English (Australia)', flag: '🇦🇺' },
      { code: 'en-ca', label: 'English (Canada)', flag: '🇨🇦' },
      { code: 'en-in', label: 'English (India)', flag: '🇮🇳' },
    ],
  },
  {
    label: 'Portuguese',
    languages: [
      { code: 'pt', label: 'Português', flag: '🇵🇹' },
      { code: 'pt-br', label: 'Português (Brasil)', flag: '🇧🇷' },
      { code: 'pt-pt', label: 'Português (Portugal)', flag: '🇵🇹' },
    ],
  },
  {
    label: 'Spanish',
    languages: [
      { code: 'es', label: 'Español', flag: '🇪🇸' },
      { code: 'es-419', label: 'Español (Latinoamérica)', flag: '🌎' },
      { code: 'es-es', label: 'Español (España)', flag: '🇪🇸' },
      { code: 'es-mx', label: 'Español (México)', flag: '🇲🇽' },
      { code: 'es-ar', label: 'Español (Argentina)', flag: '🇦🇷' },
      { code: 'es-co', label: 'Español (Colombia)', flag: '🇨🇴' },
      { code: 'es-cl', label: 'Español (Chile)', flag: '🇨🇱' },
    ],
  },
  {
    label: 'French',
    languages: [
      { code: 'fr', label: 'Français', flag: '🇫🇷' },
      { code: 'fr-fr', label: 'Français (France)', flag: '🇫🇷' },
      { code: 'fr-ca', label: 'Français (Canada)', flag: '🇨🇦' },
      { code: 'fr-be', label: 'Français (Belgique)', flag: '🇧🇪' },
    ],
  },
  {
    label: 'German',
    languages: [
      { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
      { code: 'de-de', label: 'Deutsch (Deutschland)', flag: '🇩🇪' },
      { code: 'de-at', label: 'Deutsch (Österreich)', flag: '🇦🇹' },
      { code: 'de-ch', label: 'Deutsch (Schweiz)', flag: '🇨🇭' },
    ],
  },
  {
    label: 'Italian',
    languages: [
      { code: 'it', label: 'Italian', flag: '🇮🇹' },
      { code: 'it-it', label: 'Italian (Italy)', flag: '🇮🇹' },
    ],
  },
  {
    label: 'Dutch',
    languages: [
      { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
      { code: 'nl-nl', label: 'Nederlands (Nederland)', flag: '🇳🇱' },
      { code: 'nl-be', label: 'Vlaams (België)', flag: '🇧🇪' },
    ],
  },
  {
    label: 'Nordic',
    languages: [
      { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
      { code: 'nb', label: 'Norsk bokmål', flag: '🇳🇴' },
      { code: 'da', label: 'Dansk', flag: '🇩🇰' },
      { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
      { code: 'is', label: 'Íslenska', flag: '🇮🇸' },
    ],
  },
  {
    label: 'Slavic',
    languages: [
      { code: 'pl', label: 'Polski', flag: '🇵🇱' },
      { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
      { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
      { code: 'sl', label: 'Slovenščina', flag: '🇸🇮' },
      { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
      { code: 'sr', label: 'Српски', flag: '🇷🇸' },
      { code: 'bs', label: 'Bosanski', flag: '🇧🇦' },
      { code: 'mk', label: 'Македонски', flag: '🇲🇰' },
      { code: 'bg', label: 'Български', flag: '🇧🇬' },
      { code: 'ru', label: 'Русский', flag: '🇷🇺' },
      { code: 'uk', label: 'Українська', flag: '🇺🇦' },
      { code: 'be', label: 'Беларуская', flag: '🇧🇾' },
    ],
  },
  {
    label: 'Baltic',
    languages: [
      { code: 'lt', label: 'Lietuvių', flag: '🇱🇹' },
      { code: 'lv', label: 'Latviešu', flag: '🇱🇻' },
      { code: 'et', label: 'Eesti', flag: '🇪🇪' },
    ],
  },
  {
    label: 'Other European',
    languages: [
      { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
      { code: 'hu', label: 'Magyar', flag: '🇭🇺' },
      { code: 'ro', label: 'Română', flag: '🇷🇴' },
      { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
      { code: 'sq', label: 'Shqip', flag: '🇦🇱' },
      { code: 'ca', label: 'Català', flag: '🏴' },
      { code: 'gl', label: 'Galego', flag: '🏴' },
      { code: 'eu', label: 'Euskara', flag: '🏴' },
      { code: 'cy', label: 'Cymraeg', flag: '🏴' },
      { code: 'ga', label: 'Gaeilge', flag: '🇮🇪' },
      { code: 'mt', label: 'Malti', flag: '🇲🇹' },
      { code: 'eo', label: 'Esperanto', flag: '🏳️' },
    ],
  },
  {
    label: 'Middle East',
    languages: [
      { code: 'he', label: 'עברית', flag: '🇮🇱' },
      { code: 'ar', label: 'العربية', flag: '🇸🇦' },
      { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
      { code: 'ur', label: 'اردو', flag: '🇵🇰' },
      { code: 'ku', label: 'Kurdî', flag: '🏴' },
      { code: 'hy', label: 'Հայերեն', flag: '🇦🇲' },
      { code: 'ka', label: 'ქართული', flag: '🇬🇪' },
      { code: 'az', label: 'Azərbaycanca', flag: '🇦🇿' },
    ],
  },
  {
    label: 'South Asian',
    languages: [
      { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
      { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
      { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
      { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
      { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
      { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
      { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
      { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
      { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
      { code: 'ne', label: 'नेपाली', flag: '🇳🇵' },
      { code: 'si', label: 'සිංහල', flag: '🇱🇰' },
    ],
  },
  {
    label: 'Southeast Asian',
    languages: [
      { code: 'th', label: 'ไทย', flag: '🇹🇭' },
      { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
      { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
      { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
      { code: 'fil', label: 'Filipino', flag: '🇵🇭' },
      { code: 'km', label: 'ខ្មែរ', flag: '🇰🇭' },
      { code: 'lo', label: 'ລາວ', flag: '🇱🇦' },
      { code: 'my', label: 'မြန်မာ', flag: '🇲🇲' },
    ],
  },
  {
    label: 'East Asian',
    languages: [
      { code: 'ja', label: '日本語', flag: '🇯🇵' },
      { code: 'ko', label: '한국어', flag: '🇰🇷' },
      { code: 'zh', label: '中文', flag: '🇨🇳' },
      { code: 'zh-cn', label: '中文 (简体)', flag: '🇨🇳' },
      { code: 'zh-tw', label: '中文 (繁體)', flag: '🇹🇼' },
      { code: 'mn', label: 'Монгол', flag: '🇲🇳' },
    ],
  },
  {
    label: 'African',
    languages: [
      { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' },
      { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
      { code: 'ha', label: 'Hausa', flag: '🇳🇬' },
      { code: 'yo', label: 'Yorùbá', flag: '🇳🇬' },
      { code: 'ig', label: 'Igbo', flag: '🇳🇬' },
      { code: 'zu', label: 'isiZulu', flag: '🇿🇦' },
      { code: 'af', label: 'Afrikaans', flag: '🇿🇦' },
      { code: 'so', label: 'Soomaali', flag: '🇸🇴' },
    ],
  },
];

/**
 * Flat list with every language, including the "no language" entry.
 *
 * @type {RoomLanguage[]}
 */
export const ROOM_LANGUAGES = [
  { code: '', label: 'No language', flag: '🌐' },
  ...ROOM_LANGUAGE_GROUPS.flatMap((group) => group.languages),
];

/**
 * Finds a language by its code.
 *
 * @param {unknown} code - ISO 639-1 code.
 * @returns {RoomLanguage|null}
 */
export const getRoomLanguage = (code) => {
  if (typeof code !== 'string') return null;
  const normalized = code.trim().toLowerCase();
  if (normalized.length < 1) return null;

  return ROOM_LANGUAGES.find((item) => item.code === normalized) ?? null;
};

/**
 * Formats a language code as `flag Label`.
 *
 * @param {unknown} code - ISO 639-1 code.
 * @returns {string} The formatted label, or an empty string when unknown.
 */
export const formatRoomLanguage = (code) => {
  const language = getRoomLanguage(code);
  return language ? `${language.flag} ${language.label}` : '';
};

/**
 * Builds a `<select>` with the available languages.
 *
 * @param {Object} [options] - Options.
 * @param {string} [options.value] - Initially selected code.
 * @param {string} [options.id] - Element id.
 * @param {string} [options.allLabel] - Label of the "any language" entry. When
 *   omitted the first entry is the "no language" option used by the settings.
 * @param {string} [options.className] - Extra classes for the `<select>`.
 * @returns {TinyHtmlAny}
 */
export const createLanguageSelect = ({
  value = '',
  id = 'room-language',
  allLabel = '',
  className = 'form-select',
} = {}) => {
  const $select = TinyHtml.createFrom('select', { class: className }).setAttr('id', id);
  const selected = (value ?? '').trim().toLowerCase();

  /**
   * @param {RoomLanguage} language - Language of the option.
   * @param {string} [label] - Optional label override.
   */
  const createOption = (language, label) => {
    const $option = TinyHtml.createFrom('option', { value: language.code }).setText(
      label ?? `${language.flag} ${language.label}`.trim(),
    );
    if (language.code === selected) $option.setProp('selected', true);
    return $option;
  };

  // The filter uses a custom label for the "any language" entry, while the
  // settings form keeps the "no language" one.
  const emptyLabel = allLabel.length > 0 ? allLabel : null;
  $select.append(createOption(ROOM_LANGUAGES[0], emptyLabel ?? undefined));

  for (const group of ROOM_LANGUAGE_GROUPS) {
    const $group = TinyHtml.createFrom('optgroup').setAttr('label', group.label);
    for (const language of group.languages) $group.append(createOption(language));
    $select.append($group);
  }

  return $select;
};
