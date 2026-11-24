import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { confirm } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { tinyIo } from '../software/base.mjs';
import {
  formatTime,
  getLivePosition,
  getLocalDuration,
  getState,
  getTracks,
  onPlayerChange,
  previousTrack,
  restartTrack,
  seekTo,
  sendPlayerAction,
} from '../roomPlayer.mjs';
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

      const $remove = TinyHtml.createFrom('button')
        .addClass('btn btn-sm btn-outline-danger')
        .setAttr({ type: 'button', title: 'Remove track' })
        .append(TinyHtml.createFrom('i').addClass('fas fa-trash'));

      $remove.on('click', () => {
        tracks.splice(index, 1);
        renderTracks();
      });

      $trackList.append(
        TinyHtml.createFrom('div')
          .addClass('d-flex align-items-center gap-2 border-bottom py-1')
          .append(
            TinyHtml.createFrom('span')
              .addClass('text-truncate flex-grow-1 small')
              .setText(
                `${track.type === 'youtube' ? '\u25b6' : '\u266a'} ${track.title || track.id}`,
              ),
            $up,
            $down,
            $remove,
          ),
      );
    });
  };

  const $addTrack = tinyLib.bs.button('secondary').addClass('w-100 mt-2').setText('Add track');

  $addTrack.on('click', () => {
    const id = String($trackId.val() ?? '').trim();
    if (id.length < 1) return;

    tracks.push({
      type: String($trackType.val() ?? 'youtube'),
      id,
      file: 0,
      title: String($trackTitle.val() ?? '').trim() || null,
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
    $save,
  );

  const { modal } = tinyLib.modal({
    title: isNew ? 'New playlist' : 'Edit playlist',
    dialog: 'modal-lg',
    id: 'room-player-editor',
    body: $root,
  });

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
    const result = await client.savePlaylist({
      playlistId: playlist?.playlistId ?? null,
      name,
      tracks,
      scope,
      rooms: scope === 'rooms' ? [roomId] : [],
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

    $bar.append(
      TinyHtml.createFrom('i').addClass(state.playing ? 'fas fa-volume-high' : 'fas fa-pause'),
      TinyHtml.createFrom('div')
        .addClass('flex-grow-1 text-truncate')
        .append(
          TinyHtml.createFrom('div')
            .addClass('text-truncate')
            .setText(
              `${currentPlaylist(state)?.name || state.playlistId} - ${
                track?.title || track?.id || ''
              }`.trim(),
            ),
          $time,
        ),
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

    // The bar is always rendered for the DJ: hiding it until the media knows
    // its own duration made it look like the control did not exist.
    if (canEdit) {
      const $range = TinyHtml.createFrom('input')
        .addClass('form-range mt-2')
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
    const button = target?.closest ? target.closest('[data-player-action]') : null;
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
    const target = /** @type {Element|null} */ (event.target);
    if (!target || target.getAttribute('data-player-action') !== 'seek') return;

    const state = getState();
    const duration = resolveDuration(state);
    if (!state || duration <= 0) return;

    scrubbing = Number(target.value) * duration;
    scrubKey = `${state.playlistId}:${state.trackIndex}`;
    renderTime();
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
        TinyHtml.createFrom('div').addClass('text-muted').setText('No playlists found.'),
      );
      return;
    }

    const state = getState();

    for (const playlist of playlists) {
      const isCurrent = state?.playlistId === playlist.playlistId;
      const total = Array.isArray(playlist.tracks) ? playlist.tracks.length : 0;

      const $actions = TinyHtml.createFrom('div').addClass('d-flex gap-1');

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
                    }`,
                  ),
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

    const result = await client.listPlaylists({ roomId, filter });
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

  const $toolbar = TinyHtml.createFrom('div').addClass('d-flex gap-2').append($filter);

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
      stopTicker();
    },
  });

  const unsubscribe = onPlayerChange(() => {
    renderNowPlaying();
    render();
  });

  load();
};

export default openRoomPlayer;
