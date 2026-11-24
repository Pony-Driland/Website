import { tinyIo } from './software/base.mjs';
import musicPlayer from '../chapter_manager/music/player.mjs';

/**
 * Music player of the roleplay room.
 *
 * The server stores a single interaction per room: the track, the position and
 * the **server** timestamp of that position. Every client derives the live
 * position from it:
 *
 * ```
 * live = position + (serverNow() - updatedAt) / 1000
 * ```
 *
 * `serverNow()` is the local clock corrected by the offset measured against the
 * server, so a visitor that joins one hour later still lands on the exact same
 * second as everybody else, no matter how wrong the local clock is.
 *
 * The golden rule of this module: **the audio engine is only touched when the
 * room really changed**. Loading a track is expensive and restarts it from the
 * beginning, so every function here is written to be idempotent and to never
 * reload something that is already playing.
 *
 * @module ai/roomPlayer
 */

/**
 * @typedef {Object} RoomPlayerState
 * @property {string} roomId - Room id.
 * @property {string|null} playlistId - Playlist being played.
 * @property {number} trackIndex - Index of the current track.
 * @property {number} position - Position, in seconds, at `updatedAt`.
 * @property {number} duration - Duration of the current track, in seconds.
 * @property {boolean} playing - Whether the player is running.
 * @property {boolean} loop - Whether the playlist restarts when it ends.
 * @property {number} volume - Volume between 0 and 1.
 * @property {number} revision - Increments on every interaction.
 * @property {number} updatedAt - Server timestamp of the last interaction.
 * @property {string|null} updatedBy - Account that made the last interaction.
 */

/**
 * How far the local audio may drift before it is pulled back, in seconds.
 *
 * Below this the correction would be more noticeable than the drift itself.
 */
const MAX_DRIFT = 1.2;

/** How often the local audio is compared with the room, in milliseconds. */
const DRIFT_INTERVAL = 100;

/**
 * How long a track may take to load before the player tries again.
 *
 * The audio engine holds the request until the browser allows audio to start,
 * which may take forever if the visitor never interacts with the page. The
 * timeout keeps the sync loop alive in that case.
 */
const LOAD_TIMEOUT = 20000;

/** @type {RoomPlayerState|null} */
let state = null;

/**
 * Difference between the server clock and the local one, in milliseconds.
 *
 * `serverNow() = Date.now() + clockOffset`
 *
 * @type {number}
 */
let clockOffset = 0;

/** @type {Array<Record<string, any>>} */
let tracks = [];

/** @type {Set<(state: RoomPlayerState|null) => void>} */
const listeners = new Set();

/**
 * Track that is loaded in the audio engine, as `<type>:<id>`.
 *
 * @type {string|null}
 */
let loadedKey = null;

/**
 * Track that is being loaded right now, as `<type>:<id>`.
 *
 * @type {string|null}
 */
let loadingKey = null;

/**
 * Whether the local audio is paused.
 *
 * A paused player keeps the track loaded, so resuming never restarts the song.
 *
 * @type {boolean}
 */
let paused = true;

/** @type {ReturnType<typeof setInterval>|null} */
let driftTimer = null;

/**
 * Revision that already asked the room for the next track.
 *
 * Every listener reaches the end of the track at the same time, so they all
 * ask for the next one. Without this guard the answer of the server re-enters
 * `correctDrift()`, which asks again, which answers again: an endless request
 * storm that also made the pause and the repeat buttons look broken, because
 * the room kept jumping back to the same track.
 *
 * @type {number|null}
 */
let nextRequestedFor = null;

/** @type {Promise<void>} */
let queue = Promise.resolve();

/** Whether the sync loop is already running. */
let running = false;

/** Whether the room changed while the sync loop was running. */
let dirty = false;

/**
 * Playlist whose tracks are loaded in `tracks`.
 *
 * The tracks are what turn a `trackIndex` into something playable, so the
 * player cannot start before they are known.
 *
 * @type {string|null}
 */
let tracksPlaylistId = null;

/**
 * Tracks of each playlist that was already fetched.
 *
 * Every client of the room receives the same `player-updated`, so the request
 * is shared instead of hitting the server once per event.
 *
 * @type {Map<string, Promise<Array<Record<string, any>>>>}
 */
const playlistCache = new Map();

/**
 * Current server time, in milliseconds.
 *
 * @returns {number}
 */
export const serverNow = () => Date.now() + clockOffset;

/**
 * Replaces the measured clock offset.
 *
 * @param {unknown} serverTime - Timestamp sent by the server.
 * @returns {void}
 */
export const setServerTime = (serverTime) => {
  if (typeof serverTime !== 'number' || !Number.isFinite(serverTime)) return;
  clockOffset = serverTime - Date.now();
};

/**
 * Current position of the player, in seconds.
 *
 * @param {RoomPlayerState|null} [player] - State to read, defaults to the current one.
 * @returns {number}
 */
export const getLivePosition = (player = state) => {
  if (!player) return 0;

  const base = Math.max(0, Number(player.position) || 0);
  if (!player.playing) return base;

  const updatedAt = Number(player.updatedAt);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return base;

  const elapsed = (serverNow() - updatedAt) / 1000;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return base;

  const live = base + elapsed;
  const duration = Number(player.duration);

  // The room is the only one that knows the playlist ended, and it only finds
  // out when a client reports it. Without this cap the clock would keep
  // counting forever (10:00, 20:00, 3:00:00) and the seek bar would be stuck
  // on a position that does not exist.
  if (Number.isFinite(duration) && duration > 0) return Math.min(live, duration);

  return live;
};

/**
 * Tells whether the player is running.
 *
 * @returns {boolean}
 */
export const isPlaying = () => Boolean(state?.playing);

/**
 * Tells whether the loaded playlist has no track at all.
 *
 * An empty playlist is not an error: the DJ simply did not add anything yet,
 * and the room has to say so instead of showing a frozen clock.
 *
 * @returns {boolean}
 */
export const isPlaylistEmpty = () => Boolean(state?.playlistId) && tracks.length < 1;

/**
 * Current state of the room player.
 *
 * @returns {RoomPlayerState|null}
 */
export const getState = () => state;

/**
 * Duration of the media loaded in the audio engine, in seconds.
 *
 * The room only learns the duration after a full round trip, and the report is
 * rate limited, so the local media is the fastest and most reliable source
 * while it is the one playing. Returns `0` when nothing is loaded.
 *
 * @returns {number}
 */
export const getLocalDuration = () => {
  if (!loadedKey) return 0;

  try {
    const duration = musicPlayer.getDuration();
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  } catch {
    return 0;
  }
};

/**
 * Tracks of the playlist that is loaded.
 *
 * @returns {Array<Record<string, any>>}
 */
export const getTracks = () => tracks;

/**
 * Track that should be playing right now, if any.
 *
 * @returns {Record<string, any>|null}
 */
export const getCurrentTrack = () => {
  if (!state) return null;
  return tracks[state.trackIndex] ?? null;
};

/**
 * Subscribes to the player updates.
 *
 * @param {(state: RoomPlayerState|null) => void} callback - Listener.
 * @returns {() => void} Unsubscribe function.
 */
export const onPlayerChange = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

/** @param {RoomPlayerState|null} next */
const commit = (next) => {
  state = next;
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (err) {
      console.error(err);
    }
  }
};

/**
 * Builds the key of a track, as used by the audio engine.
 *
 * @param {Record<string, any>|null|undefined} track - Track to identify.
 * @returns {string|null}
 */
const trackKey = (track) => {
  if (!track || typeof track.id !== 'string' || track.id.length < 1) return null;
  return `${track.type}:${track.id}`;
};

/**
 * Rejects when the promise takes too long, so a stuck media never blocks the
 * sync loop forever.
 *
 * @param {Promise<unknown>} promise - Promise to wait for.
 * @param {number} ms - Deadline, in milliseconds.
 * @returns {Promise<void>}
 */
const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms.`)), ms);

    promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });

/** Stops the drift watcher. */
const stopDriftWatch = () => {
  if (!driftTimer) return;
  clearInterval(driftTimer);
  driftTimer = null;
};

/**
 * Pulls the local audio back to the room position when it drifts away.
 *
 * A buffering stream, a slow tab or a suspended audio context all make the
 * local playback lag behind, and without this the room would slowly split into
 * several songs playing at once.
 *
 * @returns {Promise<void>}
 */
const correctDrift = async () => {
  if (paused || !loadedKey) return;

  // The room is paused, so there is no position to be in sync with.
  if (!state?.playing) return;

  const current = musicPlayer.getCurrentTime();

  // The media is still loading: there is nothing to compare yet.
  if (!Number.isFinite(current) || current <= 0) return;

  const expected = getLivePosition();
  const duration = musicPlayer.getDuration();

  // The song is over but the `ended` event was lost (a seek, a suspended tab
  // or a stream that never fires it). The room has to move on by itself, but
  // only once per revision: every client watches the same track, so a single
  // request is enough and the others would only duplicate the interaction.
  if (duration > 0 && expected >= duration - 1) {
    if (nextRequestedFor === state?.revision) return;

    const revision = state?.revision ?? null;
    nextRequestedFor = revision;

    // A rate limited or refused request must not silence the room until the
    // next interaction, so the guard is released after a moment.
    const release = () => {
      if (nextRequestedFor === revision) nextRequestedFor = null;
    };

    requestNextTrack()
      .then(release, (err) => {
        console.error('[room-player]', err);
        release();
      });

    return;
  }

  if (Math.abs(expected - current) <= MAX_DRIFT) return;

  // Seeking past the end would stop the media and fire `ended` on some
  // browsers, which would skip a track for no reason.
  if (duration > 0 && expected >= duration) return;

  await musicPlayer.seek(expected);
};

/** Starts the drift watcher. */
const startDriftWatch = () => {
  if (driftTimer) return;

  driftTimer = setInterval(() => {
    correctDrift().catch((err) => console.error('[room-player]', err));
  }, DRIFT_INTERVAL);
};

/**
 * Pauses the local audio without forgetting the track.
 *
 * @returns {Promise<void>}
 */
const pauseLocal = async () => {
  if (paused) return;
  paused = true;
  await musicPlayer.pause();
};

/**
 * Stops the local audio and forgets the loaded track.
 *
 * @returns {Promise<void>}
 */
const stopLocal = async () => {
  stopDriftWatch();

  const wasLoaded = loadedKey !== null || loadingKey !== null || !paused;
  loadedKey = null;
  loadingKey = null;
  paused = true;
  nextRequestedFor = null;

  if (wasLoaded) await musicPlayer.stop();
};

/**
 * Last duration reported to the room, keyed by track.
 *
 * The media engine reports `0` until the metadata arrives, so a single report
 * right after `play()` is not enough: the duration would stay unknown for the
 * whole track and the room would never learn where the playlist ends.
 *
 * @type {Map<string, number>}
 */
const reportedDurations = new Map();

/**
 * Publishes the duration of the loaded media to the room.
 *
 * The duration is what tells a visitor that joins later whether the playlist
 * already ended, so it only has to be sent once per track.
 *
 * @returns {void}
 */
const reportDuration = () => {
  if (!loadedKey) return;

  const duration = Math.round(musicPlayer.getDuration());
  if (!Number.isFinite(duration) || duration <= 0) return;
  if (reportedDurations.get(loadedKey) === duration) return;

  // Every listener watches the same track, so the room already knows the
  // duration as soon as the first one reports it. Without this check a room
  // with 50 listeners would bump the revision 50 times per track.
  if (duration === Math.round(Number(state?.duration))) {
    reportedDurations.set(loadedKey, duration);
    return;
  }

  reportedDurations.set(loadedKey, duration);

  // The answer of the server re-enters `applyState()`, so this must never run
  // inside the sync loop: it would await its own queue and deadlock.
  Promise.resolve()
    .then(() => sendPlayerAction({ action: 'duration', duration }))
    .catch((err) => console.error('[room-player]', err));
};

/**
 * Loads a track and starts it at the position the room is listening to.
 *
 * @param {Record<string, any>} track - Track to load.
 * @param {string} key - Key of the track.
 * @returns {Promise<void>}
 */
const loadTrack = async (track, key) => {
  if (loadingKey === key) return;
  loadingKey = key;

  const position = getLivePosition();

  try {
    // The position is handed over to the engine, so the song starts exactly
    // where the room is instead of playing a fraction of a second from zero.
    await withTimeout(
      musicPlayer.playTrackAsync(/** @type {any} */ (track), { position }),
      LOAD_TIMEOUT,
    );

    // The room moved on while the media was loading.
    if (loadingKey !== key) return;

    loadedKey = key;
    paused = false;
    startDriftWatch();

    // The engine only knows the duration after the metadata arrives, so the
    // first report is usually empty and the room would never learn where the
    // playlist ends.
    reportDuration();
    if (!reportedDurations.has(key)) {
      setTimeout(() => {
        if (loadedKey === key) reportDuration();
      }, 1500);
    }
  } catch (err) {
    console.error('[room-player]', err);
    if (loadedKey === key) loadedKey = null;
  } finally {
    if (loadingKey === key) loadingKey = null;
  }
};

/**
 * Fetches the tracks of a playlist, once per session.
 *
 * The player cannot do anything without them: `trackIndex` is meaningless on
 * its own, so a missing playlist is the difference between "play" and "do
 * nothing at all".
 *
 * @param {string} playlistId - Playlist to load.
 * @returns {Promise<void>}
 */
const ensureTracks = async (playlistId) => {
  if (tracksPlaylistId === playlistId) return;

  let request = playlistCache.get(playlistId);

  if (!request) {
    const client = tinyIo.client;
    if (!client) return;

    request = client
      .listPlaylists()
      .then((result) => {
        const list = Array.isArray(result?.playlists) ? result.playlists : [];
        for (const playlist of list) {
          if (typeof playlist?.playlistId === 'string')
            playlistCache.set(playlist.playlistId, Promise.resolve(playlist.tracks ?? []));
        }

        const found = list.find((item) => item.playlistId === playlistId);
        return Array.isArray(found?.tracks) ? found.tracks : [];
      })
      .catch((err) => {
        console.error('[room-player]', err);
        return [];
      });

    playlistCache.set(playlistId, request);
  }

  const list = await request;

  // Another update may have replaced the playlist while it was loading.
  if (state?.playlistId !== playlistId) return;

  tracks = list;
  tracksPlaylistId = playlistId;
};

/**
 * Brings the local audio in sync with the room state.
 *
 * This is the only place that talks to the audio engine, so the room player
 * can never play two tracks at once or keep playing after a pause.
 *
 * @returns {Promise<void>}
 */
const syncAudio = async () => {
  // The room is stopped: nothing may be playing.
  if (!state?.playing) {
    stopDriftWatch();
    await pauseLocal();
    return;
  }

  // `trackIndex` is useless without the playlist it points at, so the tracks
  // are always resolved before the audio engine is touched.
  if (state.playlistId) await ensureTracks(state.playlistId);

  const track = getCurrentTrack();
  const key = trackKey(track);

  // The playlist is empty or the track is gone: release the audio engine.
  if (!key) {
    await stopLocal();
    return;
  }

  // The playlist ended while the visitor was away. The room waits for the DJ
  // instead of starting the first song again. `stopLocal()` is not used here:
  // the track is still the current one, only the playback is over.
  if (isPlaylistOver()) {
    await pauseLocal();
    return;
  }

  // Another track: load it from the position the room is listening to.
  if (key !== loadedKey) {
    await loadTrack(/** @type {Record<string, any>} */ (track), key);
    return;
  }

  // Same track, resumed after a pause.
  if (paused) {
    paused = false;
    await musicPlayer.resume();
  }

  startDriftWatch();
  await correctDrift();
};

/**
 * Moves the local audio to the position of the room.
 *
 * `correctDrift()` is skipped while the player is paused, so a seek issued by
 * the DJ would only be heard after the next play. This keeps the paused media
 * on the same second the room is pointing at.
 *
 * @returns {Promise<void>}
 */
const syncPausedPosition = async () => {
  if (!paused || !loadedKey || !state?.playlistId) return;

  const expected = Math.max(0, Number(state.position) || 0);
  const current = musicPlayer.getCurrentTime();

  if (!Number.isFinite(current)) return;
  if (Math.abs(expected - current) <= MAX_DRIFT) return;

  await musicPlayer.seek(expected);
};

/**
 * Runs the sync loop, coalescing every update that arrives while it is busy.
 *
 * @returns {Promise<void>}
 */
const schedule = () => {
  dirty = true;
  if (running) return queue;

  running = true;
  queue = (async () => {
    try {
      while (dirty) {
        dirty = false;
        try {
          await syncAudio();
        } catch (err) {
          console.error('[room-player]', err);
        }
      }
    } finally {
      running = false;
    }
  })();

  return queue;
};

/**
 * Tells whether a state is older than the one already applied.
 *
 * @param {RoomPlayerState} next - State received from the server.
 * @returns {boolean}
 */
const isStale = (next) => {
  if (!state) return false;
  if (next.playlistId !== state.playlistId) return false;

  const previous = Number(state.revision);
  const current = Number(next.revision);

  return Number.isFinite(previous) && Number.isFinite(current) && current < previous;
};

/**
 * Applies a new state received from the server.
 *
 * @param {unknown} player - Raw state.
 * @param {Array<Record<string, any>>} [playlist] - Tracks of the playlist.
 * @returns {void}
 */
export const applyState = (player, playlist) => {
  if (!player || typeof player !== 'object') return;

  if (Array.isArray(playlist)) tracks = playlist;

  const next = /** @type {RoomPlayerState} */ (player);

  // A packet that arrived out of order must never rewind the room.
  if (isStale(next)) return;

  // The room moved on, so the previous "next track" request is over.
  if (nextRequestedFor !== null && next.revision !== nextRequestedFor) nextRequestedFor = null;

  commit(next);
  schedule();

  // A paused room still has to follow a seek.
  syncPausedPosition().catch((err) => console.error('[room-player]', err));
};

/**
 * Replaces the track list of the loaded playlist.
 *
 * @param {Array<Record<string, any>>} list - Tracks of the playlist.
 * @returns {void}
 */
export const setTracks = (list) => {
  tracks = Array.isArray(list) ? list : [];
};

/**
 * Forgets a cached playlist, so the next sync fetches it again.
 *
 * Called when the DJ saves a new version of a playlist: the tracks are what
turn a `trackIndex` into something playable, so a stale copy keeps playing
the old song forever.
 *
 * @param {string} playlistId - Playlist that changed.
 * @returns {void}
 */
export const invalidatePlaylist = (playlistId) => {
  if (typeof playlistId !== 'string') return;

  playlistCache.delete(playlistId);
  if (tracksPlaylistId !== playlistId) return;

  tracksPlaylistId = null;
  tracks = [];
};

/**
 * Stops the local audio and forgets the room state.
 *
 * Called when the user leaves the room, so the music does not keep playing on
 * the room browser.
 *
 * @returns {Promise<void>}
 */
export const resetRoomPlayer = async () => {
  await stopLocal();
  tracks = [];
  commit(null);
};

/**
 * Formats a duration in seconds as `m:ss`, or `h:mm:ss` when it is long
 * enough to need it.
 *
 * @param {number} seconds - Duration in seconds.
 * @returns {string}
 */
export const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');

  if (minutes < 60) return `${minutes}:${rest}`;

  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${rest}`;
};

/**
 * Sends an interaction to the server.
 *
 * @param {Object} data - Interaction.
 * @param {'play'|'pause'|'seek'|'track'|'volume'|'loop'|'duration'|'playlist'} data.action - Interaction.
 * @param {string} [data.playlistId] - Playlist of a `playlist` action.
 * @param {number} [data.trackIndex] - Track of a `track` action.
 * @param {number} [data.position] - Position, in seconds.
 * @param {number} [data.duration] - Duration of the current track, in seconds.
 * @param {number} [data.volume] - Volume between 0 and 1.
 * @param {boolean} [data.loop] - Whether the playlist restarts when it ends.
 * @param {number} [data.expectedRevision] - Only apply when the room did not move.
 * @returns {Promise<RoomPlayerState|null>}
 */
export const sendPlayerAction = async (data) => {
  const client = tinyIo.client;
  if (!client) return null;

  // The server is the source of truth, but waiting for the round trip made
  // every button feel broken: the DJ clicked pause and the song kept playing
  // until the answer arrived. The local state is applied first and replaced by
  // the server answer as soon as it lands.
  applyOptimistic(data);

  const result = await client.setPlayer(data);
  if (result?.error) {
    console.error('[room-player]', result.msg ?? 'Unknown error');
    return null;
  }

  const player = /** @type {RoomPlayerState|undefined} */ (result?.player);
  if (player) applyState(player);
  return player ?? null;
};

/**
 * Applies an interaction locally, before the server answers.
 *
 * Only the fields the interaction really changes are touched, and the revision
 * is left alone: the answer of the server is what moves it forward, so a
 * packet that arrives out of order is still detected by `isStale()`.
 *
 * @param {Record<string, any>} data - Interaction sent to the server.
 * @returns {void}
 */
const applyOptimistic = (data) => {
  if (!state) return;

  const next = { ...state };
  const position = Number(data.position);

  switch (data.action) {
    case 'play':
    case 'pause':
      next.playing = data.action === 'play';
      if (Number.isFinite(position) && position >= 0) next.position = position;
      next.updatedAt = serverNow();
      break;

    case 'seek':
      if (!Number.isFinite(position) || position < 0) return;
      next.position = position;
      next.updatedAt = serverNow();
      break;

    case 'track':
      if (Number.isFinite(Number(data.trackIndex))) next.trackIndex = Number(data.trackIndex);
      next.position = 0;
      next.duration = 0;
      next.playing = true;
      next.updatedAt = serverNow();
      break;

    case 'loop':
      next.loop = Boolean(data.loop);
      break;

    default:
      return;
  }

  commit(next);
};

/**
 * Asks the room to play the next track.
 *
 * Every client that reaches the end of the track calls this, so the room keeps
 * playing even when the DJ closed the tab. The `expectedRevision` makes the
 * call idempotent: the first one wins and the others are ignored.
 *
 * @returns {Promise<void>}
 */
export const requestNextTrack = async () => {
  if (!state?.playing) return;

  const next = state.trackIndex + 1;

  if (next < tracks.length) {
    await sendPlayerAction({
      action: 'track',
      trackIndex: next,
      expectedRevision: state.revision,
    });
    return;
  }

  // The playlist is over. The room either starts it again or stops and waits
  // for the DJ, but it never keeps a finished track on the screen.
  if (state.loop) {
    await sendPlayerAction({
      action: 'track',
      trackIndex: 0,
      expectedRevision: state.revision,
    });
    return;
  }

  await sendPlayerAction({
    action: 'pause',
    position: 0,
    expectedRevision: state.revision,
  });
};

/**
 * Jumps to the previous track, or back to the start of the current one.
 *
 * This is what every music player does: pressing "previous" after a few
 * seconds restarts the song, and pressing it again goes one track back.
 *
 * @param {number} [threshold] - Seconds after which the track restarts.
 * @returns {Promise<void>}
 */
export const previousTrack = async (threshold = 3) => {
  if (!state) return;

  // A paused room has no playhead to rewind: the DJ wants the previous track.
  // Without this check the end of a playlist (where the position is the whole
  // duration) always looked like "restart the track" and the button did
  // nothing but seek a paused player to 0:00.
  if (state.playing && getLivePosition() > threshold) {
    await seekTo(0);
    return;
  }

  if (state.trackIndex < 1) {
    await seekTo(0);
    return;
  }

  await sendPlayerAction({ action: 'track', trackIndex: state.trackIndex - 1 });
};

/**
 * Restarts the current track from the beginning.
 *
 * @returns {Promise<void>}
 */
export const restartTrack = () => seekTo(0);

/**
 * Moves the playhead of the room.
 *
 * @param {number} seconds - Position, in seconds.
 * @returns {Promise<void>}
 */
export const seekTo = async (seconds) => {
  const position = Number(seconds);
  if (!Number.isFinite(position) || position < 0) return;

  await sendPlayerAction({ action: 'seek', position });
};

/**
 * Tells whether the playlist already ended.
 *
 * A visitor that joins the room after the last song is over must not hear the
 * first track again: the room is waiting for the DJ.
 *
 * @returns {boolean}
 */
export const isPlaylistOver = () => {
  if (!state?.playing) return false;
  if (state.loop) return false;
  if (tracks.length < 1) return false;

  // Only the last track can end the playlist.
  if (state.trackIndex < tracks.length - 1) return false;

  const duration = Number(state.duration);
  if (!Number.isFinite(duration) || duration <= 0) return false;

  return getLivePosition() >= duration;
};

// The audio engine is shared with the reader, so the room player only listens
// while a playlist of the room is loaded.
musicPlayer.player.on('ended', () => {
  if (!state?.playing || !loadedKey) return;

  // The last track of a playlist that does not repeat has nowhere to go. The
  // room is paused instead, and asking again on every `ended` would keep the
  // whole UI re-rendering on a loop.
  if (isPlaylistOver() || (tracks.length > 0 && state.trackIndex >= tracks.length - 1)) {
    if (!state.loop) return;
  }

  requestNextTrack().catch((err) => console.error('[room-player]', err));
});

export default {
  getState,
  getTracks,
  getCurrentTrack,
  getLivePosition,
  isPlaying,
  onPlayerChange,
  applyState,
  setTracks,
  setServerTime,
  serverNow,
  resetRoomPlayer,
  formatTime,
  sendPlayerAction,
  requestNextTrack,
  previousTrack,
  restartTrack,
  seekTo,
};
