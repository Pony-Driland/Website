import TinyAdvancedRaffle from 'tiny-essentials/libs/math/TinyAdvancedRaffle';

/**
 * Weighted randomness of the soundtrack.
 *
 * The reader used to shuffle the playlist once and then walk over it, which
 * meant that every track had the very same chance of being played and that the
 * only way of changing the odds was to edit the playlist by hand. This module
 * hands the decision to `TinyAdvancedRaffle`, so a playlist can now describe
 * *how* its tracks should be picked: weights, groups, pity, cooldown and even a
 * fixed opening track.
 *
 * @module chapter_manager/music/raffle
 */

/**
 * Pity configuration of a track.
 *
 * @typedef {Object} PlaylistRafflePity
 * @property {number} [threshold] - Draws without the track before the boost starts.
 * @property {number} [increment] - Weight added on every draw after the threshold.
 * @property {number} [cap] - Maximum weight added by the pity system.
 */

/**
 * How the tracks of a playlist are drawn.
 *
 * Every option is optional: a playlist without any configuration keeps the old
 * behaviour of a plain shuffle.
 *
 * @typedef {Object} PlaylistRaffleOptions
 * @property {number|null} [seed] - Seed of the RNG. A seeded playlist always plays in the same order.
 * @property {'relative'|'softmax'} [normalization] - How the weights become probabilities.
 * @property {string|number|(string|number)[]|null} [first] - Track (or tracks) that must open the playlist.
 * @property {boolean} [unique] - Whether a track may repeat before the whole playlist plays.
 * @property {number} [cooldown] - How many draws a track stays out after being played.
 * @property {number} [weight] - Default weight of a track.
 * @property {string[]|null} [groups] - Only the tracks of these groups are played.
 * @property {string[]|null} [excludeGroups] - The tracks of these groups are never played.
 * @property {(string|number)[]|null} [exclude] - Tracks that must never be played.
 * @property {PlaylistRafflePity|false|null} [pity] - Pity system applied to every track.
 * @property {() => number} [rng] - Custom RNG, mostly for tests.
 */

/**
 * Options used when the playlist does not configure anything.
 *
 * @type {Required<Pick<PlaylistRaffleOptions, 'normalization' | 'unique' | 'cooldown' | 'weight'>>}
 */
export const DEFAULT_PLAYLIST_RAFFLE = {
  normalization: 'relative',
  unique: true,
  cooldown: 0,
  weight: 1,
};

/**
 * Splits a playlist entry into its track list and its draw configuration.
 *
 * A playlist may be written as a plain array (the historical format) or as an
 * object with a `tracks` array plus the draw options, so a chapter can opt into
 * the advanced randomness without touching the playlists that do not need it.
 *
 * @param {StoryPlaylist|undefined|null} playlist - Playlist to normalize.
 * @returns {{ tracks: StoryTrack[], options: PlaylistRaffleOptions }} The normalized playlist.
 */
export const normalizePlaylist = (playlist) => {
  if (Array.isArray(playlist)) return { tracks: playlist, options: {} };

  if (playlist && typeof playlist === 'object' && Array.isArray(playlist.tracks)) {
    return { tracks: playlist.tracks, options: playlist };
  }

  return { tracks: [], options: {} };
};

/**
 * Tells whether a playlist has at least one track to play.
 *
 * @param {StoryPlaylist|undefined|null} playlist - Playlist to test.
 * @returns {boolean} `true` when the playlist can be played.
 */
export const hasPlaylist = (playlist) => normalizePlaylist(playlist).tracks.length > 0;

/**
 * Builds the unique key of a track inside a playlist.
 *
 * The index keeps duplicated entries of the playlist apart, so a song that is
 * listed twice is still drawn (and excluded) as two different entries.
 *
 * @param {StoryTrack} track - Track to identify.
 * @param {number} index - Position of the track in the playlist.
 * @returns {string} Key of the track.
 */
const trackKey = (track, index) => `${track.type}:${track.id}#${index}`;

/**
 * Tells whether a track matches a user provided reference.
 *
 * A reference may be the index of the track, its id or its `type:id` pair, so
 * a playlist can be configured without having to know the internal key format.
 *
 * @param {StoryTrack} track - Track to test.
 * @param {number} index - Position of the track in the playlist.
 * @param {string|number} ref - Reference to compare with.
 * @returns {boolean} `true` when the reference points at the track.
 */
const matches = (track, index, ref) => {
  if (typeof ref === 'number') return index === ref;
  if (typeof ref !== 'string') return false;

  return ref === track.id || ref === `${track.type}:${track.id}` || ref === trackKey(track, index);
};

/**
 * A playlist that knows how to pick its next track.
 *
 * @typedef {Object} PlaylistRaffle
 * @property {number} size - Amount of tracks that can be drawn.
 * @property {number} remaining - Amount of tracks left before the playlist repeats itself.
 * @property {() => StoryTrack|null} next - Draws the next track.
 * @property {() => void} reset - Forgets every draw, as if the playlist was just created.
 * @property {() => void} destroy - Releases the underlying raffle.
 */

/**
 * Creates the draw engine of a playlist.
 *
 * @param {StoryTrack[]} tracks - Tracks of the playlist.
 * @param {PlaylistRaffleOptions} [options] - How the tracks should be drawn.
 * @returns {PlaylistRaffle} The playlist draw engine.
 */
export const createPlaylistRaffle = (tracks, options = {}) => {
  const opts = { ...DEFAULT_PLAYLIST_RAFFLE, ...options };
  const list = Array.isArray(tracks) ? tracks : [];

  /** @type {Map<string, { track: StoryTrack, index: number }>} */
  const entries = new Map();

  const raffle = new TinyAdvancedRaffle({
    seed: typeof opts.seed === 'number' ? opts.seed : null,
    normalization: opts.normalization,
    rng: typeof opts.rng === 'function' ? opts.rng : null,
  });

  /** Keys of the tracks that already played in the current round. */
  const played = new Set();

  /** Key of the track and the draw it becomes available again. */
  const coolingDown = new Map();

  /** Keys of the tracks that must open the playlist, in order. */
  /** @type {string[]} */
  const firstKeys = [];

  let drawCount = 0;
  let destroyed = false;

  // Register every track that survived the group/exclusion filters.
  list.forEach((track, index) => {
    if (!track || typeof track.id !== 'string' || track.id.length < 1) return;
    if (typeof track.type !== 'string' || track.type.length < 1) return;
    if (track.exclude === true) return;

    const groups = Array.isArray(track.groups) ? track.groups : [];

    if (Array.isArray(opts.groups) && !opts.groups.some((group) => groups.includes(group))) {
      return;
    }

    if (Array.isArray(opts.excludeGroups) && opts.excludeGroups.some((g) => groups.includes(g))) {
      return;
    }

    if (Array.isArray(opts.exclude) && opts.exclude.some((ref) => matches(track, index, ref))) {
      return;
    }

    const key = trackKey(track, index);
    const weight = typeof track.weight === 'number' ? track.weight : opts.weight;

    entries.set(key, { track, index });
    raffle.addItem(key, {
      weight,
      label: track.title || track.id,
      groups,
      meta: { index },
    });

    // A track may bring its own pity, otherwise the playlist default is used.
    const pity = track.pity === undefined ? opts.pity : track.pity;
    if (pity && typeof pity === 'object' && Number(pity.threshold) > 0) {
      raffle.configurePity(key, {
        threshold: Number(pity.threshold),
        increment: Number(pity.increment) || 0,
        cap: typeof pity.cap === 'number' ? pity.cap : Infinity,
      });
    }
  });

  // Resolve the opening tracks only once the final list is known.
  const first = Array.isArray(opts.first) ? opts.first : opts.first === null ? [] : [opts.first];
  for (const ref of first) {
    if (typeof ref === 'undefined') continue;

    for (const [key, entry] of entries) {
      if (!matches(entry.track, entry.index, ref)) continue;
      if (!firstKeys.includes(key)) firstKeys.push(key);
      break;
    }
  }

  /** Opening tracks, kept so `reset()` can restore them. */
  const openingKeys = [...firstKeys];

  /**
   * Tells whether a track is still cooling down.
   *
   * @param {string} key - Key of the track.
   * @returns {boolean} `true` while the track must stay out of the draw.
   */
  const isCoolingDown = (key) => (coolingDown.get(key) ?? 0) > drawCount;

  /**
   * Pushes the current state of the playlist to the raffle.
   *
   * @returns {void}
   */
  const syncExclusions = () => {
    /** @type {Set<string>} */
    const excluded = new Set();

    if (opts.unique) {
      for (const key of played) excluded.add(key);
    }

    for (const key of coolingDown.keys()) {
      if (isCoolingDown(key)) {
        excluded.add(key);
      } else {
        coolingDown.delete(key);
      }
    }

    raffle.exclusions = excluded;
  };

  /**
   * Marks a track as played.
   *
   * @param {string} key - Key of the track.
   * @returns {void}
   */
  const markPlayed = (key) => {
    drawCount++;

    if (opts.unique) played.add(key);
    if (opts.cooldown > 0) coolingDown.set(key, drawCount + opts.cooldown);
  };

  /**
   * Draws a track, honouring the current exclusions.
   *
   * @returns {StoryTrack|null} The drawn track, if any.
   */
  const draw = () => {
    syncExclusions();

    const picked = raffle.drawOne();
    if (!picked) return null;

    const entry = entries.get(picked.id);
    if (!entry) return null;

    markPlayed(picked.id);
    return entry.track;
  };

  const session = {
    get size() {
      return entries.size;
    },

    get remaining() {
      if (!opts.unique) return entries.size;
      return Math.max(0, entries.size - played.size);
    },

    next: () => {
      if (destroyed || entries.size < 1) return null;

      // The opening track is not random: it is part of the playlist contract.
      const firstKey = firstKeys.shift();
      if (typeof firstKey === 'string') {
        const entry = entries.get(firstKey);
        if (entry) {
          markPlayed(firstKey);
          return entry.track;
        }
      }

      let track = draw();

      // Every track played once: a new round starts from scratch.
      if (!track && opts.unique && played.size > 0) {
        played.clear();
        track = draw();
      }

      return track;
    },

    reset: () => {
      played.clear();
      coolingDown.clear();
      firstKeys.length = 0;
      firstKeys.push(...openingKeys);
      drawCount = 0;
      raffle.clearFreqs();
      syncExclusions();
    },

    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      raffle.destroy();
    },
  };

  return session;
};
