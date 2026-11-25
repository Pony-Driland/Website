import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { confirm } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { tinyIo } from '../software/base.mjs';
import {
  formatTime,
  getLivePosition,
  getLocalDuration,
  getRoomVolume,
  getState,
  getTracks,
  onPlayerChange,
  onTrackBlocked,
  previousTrack,
  restartTrack,
  seekTo,
  sendPlayerAction,
} from '../roomPlayer.mjs';
import musicPlayer from '../../chapter_manager/music/player.mjs';
import {
  loadTrackMetadata,
  normalizeAudioFilePath,
} from '../../chapter_manager/music/audioFile.mjs';
import { getTrackTypeName, parseYoutubeId, validateTrack } from '../musicTrack.mjs';
import { drawPlaylistOrder } from '../playlistOrder.mjs';
import { exportPlaylist, getPlaylistFileName, readPlaylistFile } from '../playlistFile.mjs';
import tinyLib from '../../files/tinyLib.mjs';

/**
 * Playlist manager of the roleplay room.
 *
 * This modal only manages the playlists. The music itself is a background
 * system of the room: it starts as soon as the visitor enters and is driven by
 * the room state, never by this modal.
 *
 * Only the DJ of the room (owner, server owner and moderators) may change the
 * player. Everybody else gets a read-only view of what is playing, which is
 * also enforced by the server: hiding the buttons is a courtesy, not the
 * permission check.
 *
 * @module ai/buttons/roomPlayer
 */

/** @typedef {'all'|'room'} PlaylistFilter */

/**
 * Tells whether the signed-in account may control the player of the room.
 *
 * Mirrors `canControl()` of the server: the room owner, the server owner and
 * the room moderators are the DJs.
 *
 * @param {Record<string, any>} client - Socket client.
 * @returns {boolean}
 */
const canControlPlayer = (client) => {
  const user = client.getUser() || {};
  if (user.isAdmin) return true;
  if (typeof client.isRoomMod === 'function') return client.isRoomMod();
  return false;
};

/**
 * Opens the playlist editor.
 *
 * @param {Record<string, any>|null} playlist - Playlist to edit, if any.
 * @param {string} roomId - Room the playlist belongs to.
 * @param {() => void} onSaved - Called after a successful save.
 * @returns {void}
 */
const openPlaylistEditor = (playlist, roomId, onSaved) => {
  const client = tinyIo.client;
  if (!client) return;

  const isNew = !playlist;
  /** @type {Array<Record<string, any>>} */
  const tracks = Array.isArray(playlist?.tracks) ? [...playlist.tracks] : [];

  const $root = TinyHtml.createFrom('div');
  const $error = tinyLib.bs.alert('danger', '', false).addClass('d-none');

  const $name = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({ type: 'text', maxLength: 80, placeholder: 'Playlist name' })
    .setVal(typeof playlist?.name === 'string' ? playlist.name : '');

  const $scope = TinyHtml.createFrom('select').addClass('form-select');
  $scope.append(
    TinyHtml.createFrom('option', { value: 'all' }).setText('All my rooms'),
    TinyHtml.createFrom('option', { value: 'rooms' }).setText('Only this room'),
  );
  $scope.setVal(playlist?.scope === 'rooms' ? 'rooms' : 'all');

  const $mode = TinyHtml.createFrom('select').addClass('form-select');
  $mode.append(
    TinyHtml.createFrom('option', { value: 'ordered' }).setText('In order'),
    TinyHtml.createFrom('option', { value: 'raffle' }).setText('Shuffle (TinyAdvancedRaffle)'),
  );
  $mode.setVal(playlist?.mode === 'raffle' ? 'raffle' : 'ordered');

  // The raffle is configured with the same JSON the reader accepts, so the
  // advanced options (seed, weights, pity, cooldown) are not reimplemented.
  const $raffle = TinyHtml.createFrom('textarea')
    .addClass('form-control font-monospace')
    .setAttr({ rows: 6, spellcheck: 'false', placeholder: '{ "seed": 1, "unique": true }' });

  $raffle.setVal(playlist?.raffle ? JSON.stringify(playlist.raffle, null, 2) : '');

  const $raffleGroup = TinyHtml.createFrom('div')
    .addClass('d-none mt-2')
    .append(
      TinyHtml.createFrom('label')
        .addClass('form-label')
        .setText('Raffle options (JSON, optional)'),
      $raffle,
    );

  const syncRaffle = () => {
    $raffleGroup.toggleClass('d-none', String($mode.val() ?? 'ordered') !== 'raffle');
  };

  $mode.on('change', syncRaffle);
  syncRaffle();

  const $trackType = TinyHtml.createFrom('select').addClass('form-select');
  $trackType.append(
    TinyHtml.createFrom('option', { value: 'youtube' }).setText('YouTube'),
    TinyHtml.createFrom('option', { value: 'audio-file' }).setText('Website audio'),
  );

  const $trackId = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({ type: 'text', placeholder: 'Video id or audio folder' });

  const $trackTitle = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({ type: 'text', placeholder: 'Title (optional)' });

  // Pasting a YouTube link is the common case, so the field keeps only the
  // video id. The same happens for a local folder, where the public prefix and
  // the trailing slash are dropped.
  $trackId.on('input', () => {
    const raw = String($trackId.val() ?? '').trim();
    if (raw.length < 1) return;

    const isYoutube = String($trackType.val() ?? 'youtube') === 'youtube';

    if (isYoutube) {
      const videoId = parseYoutubeId(raw);
      if (videoId.length > 0 && videoId !== raw) $trackId.setVal(videoId);
      return;
    }

    const folder = normalizeAudioFilePath(raw);
    if (folder.length > 0 && folder !== raw) $trackId.setVal(folder);
  });

  const $trackList = TinyHtml.createFrom('div').addClass('mt-2');

  /**
   * Moves a track inside the playlist.
   *
   * @param {number} from - Current index.
   * @param {number} to - New index.
   * @returns {void}
   */
  const moveTrack = (from, to) => {
    if (to < 0 || to >= tracks.length) return;
    const [track] = tracks.splice(from, 1);
    tracks.splice(to, 0, track);
    renderTracks();
  };

  const renderTracks = () => {
    $trackList.empty();

    if (tracks.length < 1) {
      $trackList.append(
        TinyHtml.createFrom('div').addClass('text-muted small').setText('No tracks yet.'),
      );
      return;
    }

    tracks.forEach((track, index) => {
      const $up = tinyLib.bs
        .button('outline-secondary')
        .addClass('btn-sm')
        .setAttr({ type: 'button', title: 'Move up' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-arrow-up'));

      // The first track cannot go up, and the last one cannot go down.
      if (index < 1) $up.setAttr('disabled', 'disabled');
      $up.on('click', () => moveTrack(index, index - 1));

      const $down = tinyLib.bs
        .button('outline-secondary')
        .addClass('btn-sm')
        .setAttr({ type: 'button', title: 'Move down' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-arrow-down'));

      if (index >= tracks.length - 1) $down.setAttr('disabled', 'disabled');
      $down.on('click', () => moveTrack(index, index + 1));

      // Pulls the title straight from the provider, using the same resolver
      // the player uses. Useful when the song was renamed or was added by id.
      const $refresh = tinyLib.bs
        .button('outline-secondary')
        .addClass('btn-sm')
        .setAttr({ type: 'button', title: 'Refresh title from the provider' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-rotate'));

      $refresh.on('click', async () => {
        const icon = new TinyHtml($refresh.find('i'));
        icon.removeClass('fa-rotate').addClass('fa-spinner fa-spin');
        $refresh.setAttr('disabled', 'disabled');

        try {
          const metadata = await loadTrackMetadata(
            /** @type {{ type: string, id: string, file?: number }} */ (track),
          );
          const title = String(metadata?.title ?? '').trim();

          if (title.length < 1) throw new Error('The provider did not return a title.');

          tracks[index] = { ...tracks[index], title };
          $error.addClass('d-none');
          renderTracks();
        } catch (err) {
          $error
            .removeClass('d-none')
            .setText(
              `Could not refresh the title of "${track.title || track.id}": ${
                err instanceof Error ? err.message : String(err)
              }`,
            );

          icon.removeClass('fa-spinner fa-spin').addClass('fa-rotate');
          $refresh.removeProp('disabled');
        }
      });

      const $remove = TinyHtml.createFrom('button')
        .addClass('btn btn-sm btn-outline-danger')
        .setAttr({ type: 'button', title: 'Remove track' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-trash'));

      $remove.on('click', () => {
        tracks.splice(index, 1);
        renderTracks();
      });

      // The provider is part of the row: the same song may exist on both
      // sources, and the DJ has to know which one is about to play.
      const $provider = TinyHtml.createFrom('span')
        .addClass('badge text-bg-secondary text-nowrap')
        .setText(getTrackTypeName(track.type));

      // The full source is the tooltip: the row only has room for the title.
      const sourceUrl =
        track.type === 'youtube'
          ? `https://www.youtube.com/watch?v=${track.id}`
          : `/audio/${track.id}/`;

      const $label = TinyHtml.createFrom('span')
        .addClass('text-truncate flex-grow-1 small')
        .setAttr({ title: sourceUrl })
        .setText(`${track.type === 'youtube' ? '\u25b6' : '\u266a'} ${track.title || track.id}`);

      $trackList.append(
        TinyHtml.createFrom('div')
          .addClass('d-flex align-items-center gap-2 border-bottom py-1')
          .append($label, $provider, $refresh, $up, $down, $remove),
      );
    });
  };

  // Draws a new order with the raffle and writes it over the list. The result
  // is what gets saved, so every listener follows the same sequence through
  // the regular sync.
  const $shuffle = tinyLib.bs.button('outline-info').addClass('w-100 mt-2').setText('Shuffle now');

  $shuffle.on('click', () => {
    if (tracks.length < 2) return;

    let raffle = null;
    const raw = String($raffle.val() ?? '').trim();

    if (raw.length > 0) {
      try {
        raffle = JSON.parse(raw);
      } catch (err) {
        $error
          .removeClass('d-none')
          .setText(
            `The raffle options are not valid JSON: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        return;
      }
    }

    $error.addClass('d-none');

    const drawn = drawPlaylistOrder(tracks, raffle);
    tracks.splice(0, tracks.length, ...drawn);
    renderTracks();
  });

  // Import and export use the same file the reader understands, so a playlist
  // can be moved between the two without a conversion step.
  const $import = TinyHtml.createFrom('input')
    .setAttr({ type: 'file', accept: '.json,application/json' })
    .setStyle({ display: 'none' });

  const $importInput = /** @type {HTMLInputElement} */ ($import.elements[0]);

  const $importButton = tinyLib.bs
    .button('outline-secondary')
    .addClass('w-100 mt-2')
    .setText('Import JSON');

  $importButton.on('click', () => $importInput.click());

  $import.on('change', async () => {
    const file = $importInput.files?.[0];
    if (!file) return;

    try {
      const parsed = readPlaylistFile(await file.text());

      tracks.splice(0, tracks.length, ...parsed.tracks);
      if (parsed.raffle) $raffle.setVal(JSON.stringify(parsed.raffle, null, 2));

      // The playlist metadata travels with the file, so a playlist keeps its
      // name and its scope after a round trip. A field the file does not have
      // is left untouched instead of being wiped.
      if (parsed.name) $name.setVal(parsed.name);
      if (parsed.scope) $scope.setVal(parsed.scope);

      if (parsed.mode) {
        $mode.setVal(parsed.mode);
        syncRaffle();
      }

      $error.addClass('d-none');
      renderTracks();
    } catch (err) {
      $error.removeClass('d-none').setText(err instanceof Error ? err.message : String(err));
    } finally {
      $importInput.value = '';
    }
  });

  const $export = tinyLib.bs
    .button('outline-secondary')
    .addClass('w-100 mt-2')
    .setText('Export JSON');

  $export.on('click', () => {
    let raffle = null;
    const raw = String($raffle.val() ?? '').trim();

    if (raw.length > 0) {
      try {
        raffle = JSON.parse(raw);
      } catch (err) {
        $error
          .removeClass('d-none')
          .setText(
            `The raffle options are not valid JSON: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        return;
      }
    }

    const name = String($name.val() ?? '').trim();
    const scope = String($scope.val() ?? 'all') === 'rooms' ? 'rooms' : 'all';
    const mode = String($mode.val() ?? 'ordered') === 'raffle' ? 'raffle' : 'ordered';

    const blob = new Blob([exportPlaylist({ name, tracks, raffle, scope, mode })], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = getPlaylistFileName(name || 'playlist');
    link.click();

    URL.revokeObjectURL(url);
  });

  const $addTrack = tinyLib.bs.button('secondary').addClass('w-100 mt-2').setText('Add track');

  $addTrack.on('click', async () => {
    const id = String($trackId.val() ?? '').trim();
    if (id.length < 1) return;

    const type = String($trackType.val() ?? 'youtube');
    const candidate = { type, id, file: 0 };

    // The source is checked before it ever reaches the playlist: a track that
    // the player would refuse has no business being saved.
    const checked = validateTrack(candidate);
    if (!checked.ok) {
      $error.removeClass('d-none').setText(checked.reason);
      return;
    }

    $error.addClass('d-none');
    $addTrack.addProp('disabled');

    let title = String($trackTitle.val() ?? '').trim();

    // No title typed: the metadata of the source is the best name available,
    // exactly like the reader does.
    if (title.length < 1) {
      $addTrack.setText('Loading...');

      try {
        const metadata = await loadTrackMetadata(candidate);
        title = String(metadata.title ?? '').trim();
      } catch (err) {
        console.warn('[room-player] Could not load the track metadata.', err);
      } finally {
        $addTrack.setText('Add track');
        $addTrack.removeProp('disabled');
      }
    }

    tracks.push({
      type: checked.type,
      id: checked.id,
      file: 0,
      title: title.length > 0 ? title : null,
    });

    $trackId.setVal('');
    $trackTitle.setVal('');
    renderTracks();
  });

  const $save = tinyLib.bs.button('primary w-100 mt-3').setText('Save playlist');

  $root.append(
    $error,
    TinyHtml.createFrom('label').addClass('form-label').setText('Name'),
    $name,
    TinyHtml.createFrom('label').addClass('form-label mt-3').setText('Available on'),
    $scope,
    TinyHtml.createFrom('label').addClass('form-label mt-3').setText('Playback order'),
    $mode,
    $raffleGroup,
    TinyHtml.createFrom('hr').addClass('my-4'),
    TinyHtml.createFrom('h6').setText('Tracks'),
    $trackList,
    TinyHtml.createFrom('div')
      .addClass('row g-2 mt-2')
      .append(
        TinyHtml.createFrom('div').addClass('col-4').append($trackType),
        TinyHtml.createFrom('div').addClass('col-8').append($trackId),
      ),
    TinyHtml.createFrom('div').addClass('mt-2').append($trackTitle),
    $addTrack,
    $shuffle,
    $importButton,
    $export,
    $import,
    $save,
  );

  // Live position of the room, so the DJ can see which track is playing while
  // the playlist is being edited.
  const $live = TinyHtml.createFrom('div').addClass('mb-3');
  $root.prepend($live);

  const renderLive = () => {
    $live.empty();

    const state = getState();
    if (!state?.playlistId || state.playlistId !== playlist?.playlistId) return;

    const list = getTracks();
    const track = list[state.trackIndex];
    if (!track) return;

    $live.append(
      TinyHtml.createFrom('div')
        .addClass('alert alert-info mb-0 d-flex align-items-center gap-2')
        .append(
          TinyHtml.createFrom('i').addClass(state.playing ? 'fas fa-volume-high' : 'fas fa-pause'),
          TinyHtml.createFrom('span')
            .addClass('text-truncate')
            .setText(`Playing ${state.trackIndex + 1}/${list.length}: ${track.title || track.id}`),
        ),
    );
  };

  const { modal } = tinyLib.modal({
    title: isNew ? 'New playlist' : 'Edit playlist',
    dialog: 'modal-lg',
    id: 'room-player-editor',
    body: $root,
    hidden: () => unsubscribeLive(),
  });

  const unsubscribeLive = onPlayerChange(renderLive);
  renderLive();

  renderTracks();

  $save.on('click', async () => {
    const name = String($name.val() ?? '').trim();
    if (name.length < 1) {
      $error.removeClass('d-none').setText('Please enter a playlist name.');
      return;
    }

    $save.addProp('disabled');
    $error.addClass('d-none');

    const scope = String($scope.val() ?? 'all') === 'rooms' ? 'rooms' : 'all';
    const mode = String($mode.val() ?? 'ordered') === 'raffle' ? 'raffle' : 'ordered';

    // The JSON is parsed here so a typo is reported before the playlist is
    // saved, instead of silently falling back to the list order.
    let raffle = null;
    const rawRaffle = String($raffle.val() ?? '').trim();

    if (mode === 'raffle' && rawRaffle.length > 0) {
      try {
        raffle = JSON.parse(rawRaffle);
      } catch (err) {
        $error
          .removeClass('d-none')
          .setText(
            `The raffle options are not valid JSON: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        return;
      }
    }

    const result = await client.savePlaylist({
      playlistId: playlist?.playlistId ?? null,
      name,
      tracks,
      scope,
      rooms: scope === 'rooms' ? [roomId] : [],
      mode,
      raffle,
    });

    $save.removeProp('disabled');

    if (result.error) {
      $error.removeClass('d-none').setText(result.msg ?? 'Unknown error');
      return;
    }

    modal.hide();
    onSaved();
  });
};

/**
 * Opens the playlist manager of the room.
 *
 * @returns {void}
 */
export const openRoomPlayer = () => {
  const client = tinyIo.client;
  if (!client) return;

  const roomId = String(client.getRoomId() ?? '');
  const canEdit = canControlPlayer(client);

  /** @type {PlaylistFilter} */
  let filter = 'all';
  /** @type {string} */
  let search = '';
  /** @type {Array<Record<string, any>>} */
  let playlists = [];
  let loading = true;

  const $root = TinyHtml.createFrom('div');
  const $error = tinyLib.bs.alert('danger', '', false).addClass('d-none');
  const $list = TinyHtml.createFrom('div').addClass('mt-3');
  const $nowPlaying = TinyHtml.createFrom('div').addClass('mb-3');

  /** @type {ReturnType<typeof setInterval>|null} */
  let ticker = null;

  /**
   * Position the DJ is scrubbing to, in seconds.
   *
   * While it is a number the bar follows the pointer instead of the room, so
   * the handle does not jump back on every `player-updated`.
   *
   * @type {number|null}
   */
  let scrubbing = null;

  /** @type {TinyHtmlAny|null} */
  let $time = null;

  /** @type {HTMLInputElement|null} */
  let $seek = null;

  /** @type {HTMLInputElement|null} */
  let $volume = null;

  /**
   * Whether the visitor already picked a volume in this session.
   *
   * The room volume is only a starting point: as soon as the visitor moves the
   * slider their choice wins, otherwise the room would keep overwriting it on
   * every update.
   *
   * @type {boolean}
   */
  let volumeTouched = false;

  /**
   * Track the pending scrub belongs to.
   *
   * The bar is rebuilt on every `player-updated`, so a drag interrupted by a
   * render never fires `change`. Without this the flag would survive the track
   * change and freeze the handle on a position that does not exist anymore.
   *
   * @type {string|null}
   */
  let scrubKey = null;

  const showError = (/** @type {string} */ msg) => $error.removeClass('d-none').setText(msg);
  const clearError = () => $error.addClass('d-none');

  /**
   * Duration of the track that is loaded, in seconds.
   *
   * The room only learns the duration after a round trip, and the report is
   * rate limited, so the local media wins while it is the one playing. Every
   * consumer has to agree on the value, otherwise the bar is enabled by one
   * and ignored by the other.
   *
   * @param {Record<string, any>|null} state - Current room state.
   * @returns {number}
   */
  const resolveDuration = (state) => {
    const local = getLocalDuration();
    if (local > 0) return local;

    const remote = Number(state?.duration);
    return Number.isFinite(remote) && remote > 0 ? remote : 0;
  };

  /**
   * Updates only the clock of the now playing bar.
   *
   * Rebuilding the bar on every tick would steal the focus of the buttons (and
   * cancel a click that is still being dispatched), so the ticker touches the
   * text node and nothing else.
   *
   * @returns {void}
   */
  const renderTime = () => {
    if (!$time) return;

    const state = getState();
    if (!state) {
      $time.setText('');
      return;
    }

    const live = scrubbing ?? getLivePosition(state);
    const duration = resolveDuration(state);
    const total = duration > 0 ? ` / ${formatTime(duration)}` : '';

    $time.setText(`${formatTime(live)}${total}`);

    // The bar is rebuilt on every render, so the reference may already be
    // detached. Writing to it would be harmless but useless.
    if (!$seek || !$seek.isConnected) return;

    // The native property is used on purpose: the wrapper does not move the
    // handle of a range input, which left the bar stuck on 0:00.
    $seek.disabled = duration <= 0;
    $seek.value = String(duration > 0 ? Math.min(1, Math.max(0, live / duration)) : 0);
  };

  /** Starts the clock of the now playing bar. */
  const startTicker = () => {
    if (ticker) return;
    ticker = setInterval(renderTime, 500);
  };

  /** Stops the clock of the now playing bar. */
  const stopTicker = () => {
    if (!ticker) return;
    clearInterval(ticker);
    ticker = null;
  };

  /**
   * Playlist that is loaded in the room, if the modal knows about it.
   *
   * The list is filtered by the select, so the playlist may not be there even
   * when the room is playing it.
   *
   * @param {Record<string, any>} state - Current room state.
   * @returns {Record<string, any>|null}
   */
  const currentPlaylist = (state) =>
    playlists.find((item) => item.playlistId === state.playlistId) ?? null;

  /**
   * Tracks of the playlist that is loaded in the room.
   *
   * The modal already downloaded the playlist, so it is the best source while
   * the room is paused: the audio engine only fetches the tracks when it has
   * something to play, and waiting for it would leave the bar empty (and the
   * whole panel locked behind the "no tracks" warning) until the DJ hits play.
   *
   * @param {Record<string, any>} state - Current room state.
   * @returns {Array<Record<string, any>>}
   */
  const currentTracks = (state) => {
    const playlist = currentPlaylist(state);
    if (Array.isArray(playlist?.tracks)) return playlist.tracks;
    return getTracks();
  };

  /** Read-only summary of what the room is playing right now. */
  const renderNowPlaying = () => {
    $nowPlaying.empty();
    $time = null;
    $seek = null;

    const state = getState();
    if (!state?.playlistId) {
      stopTicker();
      scrubbing = null;
      return;
    }

    const roomTracks = currentTracks(state);
    const track = roomTracks[state.trackIndex];

    // A scrub belongs to the track it started on.
    const trackKey = `${state.playlistId}:${state.trackIndex}`;
    if (scrubKey !== null && scrubKey !== trackKey) {
      scrubbing = null;
      scrubKey = null;
    }

    // An empty playlist has nothing to play, so the clock is meaningless: the
    // room says why it is silent instead of freezing on 0:00.
    if (roomTracks.length < 1) {
      stopTicker();
      scrubbing = null;

      $nowPlaying.append(
        TinyHtml.createFrom('div')
          .addClass('alert alert-warning mb-0 d-flex align-items-center gap-2')
          .append(
            TinyHtml.createFrom('i').addClass('fas fa-triangle-exclamation'),
            TinyHtml.createFrom('span')
              .addClass('flex-grow-1')
              .setText('This playlist has no tracks yet.'),
          ),
      );

      return;
    }

    $time = TinyHtml.createFrom('span').addClass('font-monospace small');

    const $bar = TinyHtml.createFrom('div').addClass(
      'alert alert-secondary mb-0 d-flex align-items-center gap-2',
    );

    const sourceUrl =
      track?.type === 'youtube'
        ? `https://www.youtube.com/watch?v=${track.id}`
        : track?.id
          ? `/audio/${track.id}/`
          : null;

    const canOpenSource = Boolean(sourceUrl) && track?.type === 'youtube';

    const $source = TinyHtml.createFrom(canOpenSource ? 'a' : 'span')
      .addClass('btn btn-outline-info btn-sm')
      .setAttr({
        title: `Source: ${getTrackTypeName(track?.type)}`,
        'aria-label': `Source: ${getTrackTypeName(track?.type)}`,
      });

    if (canOpenSource) {
      $source.setAttr({ href: sourceUrl, target: '_blank', rel: 'noopener noreferrer' });
    } else {
      $source.setStyle({ cursor: 'default' });
    }

    $source.append(TinyHtml.createFrom('i').addClass('fas fa-info-circle'));

    // The provider is part of the title: the same song may exist on both
    // sources, and the listener has to know which one is playing.
    const $title = TinyHtml.createFrom('div').addClass('text-truncate');

    if (track?.type) {
      $title.append(
        TinyHtml.createFrom('span')
          .addClass('badge text-bg-secondary me-2 text-nowrap')
          .setText(getTrackTypeName(track.type)),
      );
    }

    $title.append(
      TinyHtml.createFrom('span').setText(
        `${currentPlaylist(state)?.name || state.playlistId} - ${
          track?.title || track?.id || ''
        }`.trim(),
      ),
    );

    $bar.append(
      TinyHtml.createFrom('i').addClass(state.playing ? 'fas fa-volume-high' : 'fas fa-pause'),
      TinyHtml.createFrom('div').addClass('flex-grow-1 text-truncate').append($title, $time),
      $source,
    );

    // The transport is the DJ's tool. A regular listener only reads the bar.
    if (canEdit) {
      const isLast = state.trackIndex >= roomTracks.length - 1;

      const $restart = tinyLib.bs
        .button('outline-secondary')
        .addClass('btn-sm')
        .setAttr({ 'data-player-action': 'restart', title: 'Restart track' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-rotate-left'));

      const $prev = tinyLib.bs
        .button('outline-secondary')
        .addClass('btn-sm')
        .setAttr({ 'data-player-action': 'prev', title: 'Previous track' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-backward'));

      const $toggle = tinyLib.bs
        .button(state.playing ? 'warning' : 'success')
        .addClass('btn-sm')
        .setAttr({ 'data-player-action': 'toggle', title: state.playing ? 'Pause' : 'Play' })
        .append(TinyHtml.createFrom('i').addClass(state.playing ? 'fas fa-pause' : 'fas fa-play'));

      const $stop = tinyLib.bs
        .button('outline-secondary')
        .addClass('btn-sm')
        .setAttr({ 'data-player-action': 'stop', title: 'Stop' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-stop'));

      const $next = tinyLib.bs
        .button('outline-secondary')
        .addClass('btn-sm')
        .setAttr({ 'data-player-action': 'next', title: 'Next track' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-forward'));

      // There is nowhere to go after the last track of a playlist that does
      // not repeat, so the button would only restart the same song.
      if (isLast && !state.loop) $next.setAttr('disabled', 'disabled');

      // The room owner decides whether the playlist restarts or stops when the
      // last track ends.
      const $loop = tinyLib.bs
        .button(state.loop ? 'info' : 'outline-secondary')
        .addClass('btn-sm')
        .setAttr({ 'data-player-action': 'loop', title: state.loop ? 'Repeat: on' : 'Repeat: off' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-repeat'));

      $bar.append($restart, $prev, $toggle, $stop, $next, $loop);
    }

    $nowPlaying.append($bar);

    // The volume is personal: it is applied locally and, for the DJ, also
    // stored in the room so a visitor starts on the same level.
    const $volumeRow = TinyHtml.createFrom('div').addClass('d-flex align-items-center gap-2 mt-2');
    const $volumeIcon = TinyHtml.createFrom('i').addClass('fas fa-volume-high');

    const $volumeInput = TinyHtml.createFrom('input')
      .addClass('form-range room-player-volume')
      .setAttr({
        type: 'range',
        min: '0',
        max: '100',
        step: '1',
        'data-player-action': 'volume',
        title: 'Volume',
      });

    $volume = /** @type {HTMLInputElement} */ ($volumeInput.elements[0]);
    $volume.value = String(musicPlayer.getVolume());

    $volumeRow.append($volumeIcon, $volumeInput);
    $nowPlaying.append($volumeRow);

    // The bar is always rendered for the DJ: hiding it until the media knows
    // its own duration made it look like the control did not exist.
    if (canEdit) {
      const $range = TinyHtml.createFrom('input')
        .addClass('form-range room-player-seek mt-2')
        .setAttr({
          type: 'range',
          min: '0',
          max: '1',
          step: 'any',
          'data-player-action': 'seek',
          title: 'Seek',
        });

      $seek = /** @type {HTMLInputElement} */ ($range.elements[0]);
      $nowPlaying.append($range);
    } else {
      $seek = null;
    }

    renderTime();
    applyRoomVolume();

    // The clock also runs while the room is paused: the DJ still has to see
    // where the playhead is before resuming.
    startTicker();
  };

  /**
   * Handles the transport buttons of the now playing bar.
   *
   * The bar is rebuilt on every `player-updated`, so a listener bound to the
   * button itself is destroyed before the click is dispatched. Listening on
   * the container that outlives the render keeps the buttons working.
   */
  $nowPlaying.on('click', async (event) => {
    const target = /** @type {Element|null} */ (event.target);
    const button = /** @type {HTMLButtonElement|null} */ (
      target?.closest ? target.closest('[data-player-action]') : null
    );
    if (!button) return;

    // The server is the permission check, this is only the fast path.
    if (!canEdit) return;

    const action = button.getAttribute('data-player-action');
    const current = getState();
    if (!current) return;

    // The slider is not a button and must not be disabled while dragging.
    if (action === 'seek') return;

    // The button is disabled while the room acknowledges the interaction, so a
    // double click cannot toggle twice.
    if (button.disabled) return;
    button.disabled = true;

    try {
      if (action === 'toggle') {
        await sendPlayerAction({
          action: current.playing ? 'pause' : 'play',
          position: getLivePosition(current),
        });
      } else if (action === 'next') {
        // The last track of a repeating playlist goes back to the first one.
        const total = getTracks().length;
        const nextIndex = current.trackIndex + 1;

        await sendPlayerAction({
          action: 'track',
          trackIndex: total > 0 && nextIndex >= total ? 0 : nextIndex,
        });
      } else if (action === 'prev') {
        await previousTrack();
      } else if (action === 'restart') {
        await restartTrack();
      } else if (action === 'stop') {
        await sendPlayerAction({ action: 'pause', position: 0 });
      } else if (action === 'loop') {
        await sendPlayerAction({ action: 'loop', loop: !current.loop });
      }
    } finally {
      // The bar is rebuilt by `onPlayerChange`, so the button may already be
      // detached. Re-rendering keeps the state right when the server refused
      // the interaction.
      button.disabled = false;
      renderNowPlaying();
    }
  });

  /**
   * Follows the seek handle while the DJ drags it.
   *
   * The room is only told when the pointer is released, otherwise a single drag
   * would flood the socket with one interaction per pixel.
   */
  $nowPlaying.on('input', (event) => {
    const target = /** @type {HTMLInputElement|null} */ (event.target);
    if (!target || target.getAttribute('data-player-action') !== 'seek') return;

    const state = getState();
    const duration = resolveDuration(state);
    if (!state || duration <= 0) return;

    scrubbing = Number(target.value) * duration;
    scrubKey = `${state.playlistId}:${state.trackIndex}`;
    renderTime();
  });

  /**
   * Applies the volume of the room to the local audio.
   *
   * The DJ is the only one that writes it, so the value is only read here.
   * A visitor that already picked a volume keeps it: the room is a starting
   * point, not a remote control for somebody else's speakers.
   *
   * @returns {void}
   */
  const applyRoomVolume = () => {
    if (volumeTouched) return;

    const volume = getRoomVolume();
    if (volume === null) return;

    musicPlayer.setVolume(Math.round(volume * 100));
    if ($volume) $volume.value = String(Math.round(volume * 100));
  };

  $nowPlaying.on('input', (event) => {
    const target = /** @type {HTMLInputElement|null} */ (event.target);
    if (!target || target.getAttribute('data-player-action') !== 'volume') return;

    const volume = Math.max(0, Math.min(100, Number(target.value) || 0));
    volumeTouched = true;
    musicPlayer.setVolume(volume);

    // The DJ owns the room volume, so the change is also stored for the next
    // visitor. Everybody else only changes the local output.
    if (canEdit) sendPlayerAction({ action: 'volume', volume: volume / 100 }).catch(() => {});
  });

  $nowPlaying.on('change', async (event) => {
    const target = /** @type {Element|null} */ (event.target);
    if (!target || target.getAttribute('data-player-action') !== 'seek') return;

    const state = getState();
    const position = scrubbing;

    scrubbing = null;
    scrubKey = null;
    if (!state || position === null) return;

    const duration = resolveDuration(state);
    await seekTo(Math.max(0, duration > 0 ? Math.min(position, duration) : position));
  });

  const render = () => {
    $list.empty();

    if (loading) {
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('Loading...'));
      return;
    }

    if (playlists.length < 1) {
      $list.append(
        TinyHtml.createFrom('div')
          .addClass('text-muted')
          .setText(
            search.trim().length ? 'No playlist matches your search.' : 'No playlists found.',
          ),
      );
      return;
    }

    const state = getState();

    for (const playlist of playlists) {
      const isCurrent = state?.playlistId === playlist.playlistId;
      const total = Array.isArray(playlist.tracks) ? playlist.tracks.length : 0;

      const $actions = TinyHtml.createFrom('div').addClass('d-flex gap-1');

      // Which providers the playlist uses, so the DJ knows what to expect
      // without opening it.
      const providers = [
        ...new Set(
          (Array.isArray(playlist.tracks) ? playlist.tracks : []).map((item) =>
            getTrackTypeName(item?.type),
          ),
        ),
      ].filter((name) => name.length > 0);

      // Starting a playlist is a player interaction, so it belongs to the DJ.
      if (canEdit) {
        const $play = tinyLib.bs
          .button(isCurrent ? 'success' : 'primary')
          .addClass('btn-sm')
          .setText(isCurrent ? 'Playing' : 'Play');

        if (isCurrent) $play.setAttr('disabled', 'disabled');

        $play.on('click', async () => {
          const result = await sendPlayerAction({
            action: 'playlist',
            playlistId: playlist.playlistId,
          });

          if (!result) return;
          renderNowPlaying();
          render();
        });

        $actions.append($play);

        const $edit = tinyLib.bs
          .button('outline-secondary btn-sm')
          .setAttr('title', 'Edit playlist')
          .append(TinyHtml.createFrom('i').addClass('fas fa-pen'));

        $edit.on('click', () => {
          modal.hide();
          openPlaylistEditor(playlist, roomId, () => {
            load();
            openRoomPlayer();
          });
        });

        const $delete = tinyLib.bs
          .button('outline-danger btn-sm')
          .setAttr('title', 'Delete playlist')
          .append(TinyHtml.createFrom('i').addClass('fas fa-trash'));

        $delete.on('click', async () => {
          if (!(await confirm(`Delete the playlist "${playlist.name}"?`))) return;
          const result = await client.deletePlaylist(playlist.playlistId);
          if (result.error) return showError(result.msg ?? 'Unknown error');
          load();
        });

        $actions.append($edit, $delete);
      }

      $list.append(
        TinyHtml.createFrom('div')
          .addClass('d-flex align-items-center gap-2 border-bottom py-2')
          .append(
            TinyHtml.createFrom('div')
              .addClass('flex-grow-1')
              .append(
                TinyHtml.createFrom('strong').setText(playlist.name || playlist.playlistId),
                TinyHtml.createFrom('div')
                  .addClass('small text-muted')
                  .setText(
                    `${total} track(s) - ${
                      playlist.scope === 'all' ? 'all rooms' : 'selected rooms'
                    } - ${playlist.mode === 'raffle' ? 'shuffle' : 'in order'}`,
                  ),
                providers.length > 0
                  ? TinyHtml.createFrom('div')
                      .addClass('small text-muted')
                      .setText(providers.join(', '))
                  : null,
              ),
            $actions,
          ),
      );
    }
  };

  const load = async () => {
    loading = true;
    clearError();
    render();

    const result = await client.listPlaylists({ roomId, filter, search: search.trim() || null });
    loading = false;

    if (result.error) showError(result.msg ?? 'Unknown error');
    playlists = Array.isArray(result.playlists) ? result.playlists : [];

    renderNowPlaying();
    render();
  };

  const $filter = TinyHtml.createFrom('select').addClass('form-select');
  $filter.append(
    TinyHtml.createFrom('option', { value: 'all' }).setText('All playlists'),
    TinyHtml.createFrom('option', { value: 'room' }).setText('This room only'),
  );

  $filter.on('change', () => {
    filter = String($filter.val() ?? 'all') === 'room' ? 'room' : 'all';
    load();
  });

  const $new = tinyLib.bs.button('success').setText('New playlist');
  $new.on('click', () => {
    modal.hide();
    openPlaylistEditor(null, roomId, () => {
      load();
      openRoomPlayer();
    });
  });

  // The term is resolved by the database, so a keystroke does not become a
  // request: the field waits for a pause before asking again.
  /** @type {ReturnType<typeof setTimeout>|null} */
  let searchTimer = null;

  const $search = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({ type: 'search', placeholder: 'Search by name', 'aria-label': 'Search by name' });

  $search.on('input', () => {
    search = String($search.val() ?? '');

    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTimer = null;
      load();
    }, 300);
  });

  const $toolbar = TinyHtml.createFrom('div').addClass('d-flex gap-2').append($filter, $search);

  // A listener cannot create a playlist, so the button is not even rendered.
  if (canEdit) $toolbar.append($new);

  $root.append($error, $nowPlaying, $toolbar, $list);

  const { modal } = tinyLib.modal({
    title: 'Room playlists',
    dialog: 'modal-lg',
    id: 'room-player',
    body: $root,
    // The modal is rebuilt on every open, so neither the listener nor the
    // clock may outlive it.
    hidden: () => {
      unsubscribe();
      unsubscribeBlocked();
      stopTicker();
    },
  });

  const unsubscribe = onPlayerChange(() => {
    renderNowPlaying();
    render();
  });

  // A refused track never reaches the audio engine, so the reason has to be
  // shown here or the room would look silent for no reason.
  const unsubscribeBlocked = onTrackBlocked((reason) => {
    showError(`This track was blocked for security reasons. ${reason}`);
  });

  load();
};

export default openRoomPlayer;
