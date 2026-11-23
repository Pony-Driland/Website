import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { confirm } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { tinyIo } from '../software/base.mjs';
import {
  formatTime,
  getLivePosition,
  getState,
  onPlayerChange,
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
 * @module ai/buttons/roomPlayer
 */

/** @typedef {'all'|'room'} PlaylistFilter */

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

  const renderTracks = () => {
    $trackList.empty();

    if (tracks.length < 1) {
      $trackList.append(
        TinyHtml.createFrom('div').addClass('text-muted small').setText('No tracks yet.'),
      );
      return;
    }

    tracks.forEach((track, index) => {
      const $remove = TinyHtml.createFrom('button')
        .addClass('btn btn-sm btn-outline-danger')
        .setAttr('type', 'button')
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
  const room = client.getRoom() || {};
  const user = client.getUser() || {};
  const canEdit = room.ownerId === client.getUserId() || Boolean(user.isOwner);

  /** @type {PlaylistFilter} */
  let filter = 'all';
  /** @type {Array<Record<string, any>>} */
  let playlists = [];
  let loading = true;

  const $root = TinyHtml.createFrom('div');
  const $error = tinyLib.bs.alert('danger', '', false).addClass('d-none');
  const $list = TinyHtml.createFrom('div').addClass('mt-3');
  const $nowPlaying = TinyHtml.createFrom('div').addClass('mb-3');

  const showError = (/** @type {string} */ msg) => $error.removeClass('d-none').setText(msg);
  const clearError = () => $error.addClass('d-none');

  /** Read-only summary of what the room is playing right now. */
  const renderNowPlaying = () => {
    $nowPlaying.empty();

    const state = getState();
    if (!state?.playlistId) return;

    const playlist = playlists.find((item) => item.playlistId === state.playlistId);
    const track = playlist?.tracks?.[state.trackIndex];

    const $toggle = tinyLib.bs
      .button(state.playing ? 'warning' : 'success')
      .addClass('btn-sm')
      .setAttr('title', state.playing ? 'Pause' : 'Play')
      .append(TinyHtml.createFrom('i').addClass(state.playing ? 'fas fa-pause' : 'fas fa-play'));

    $toggle.on('click', async () => {
      // The position is sent along, so the room pauses exactly where it is
      // instead of rewinding to the last interaction.
      await sendPlayerAction({
        action: state.playing ? 'pause' : 'play',
        position: getLivePosition(state),
      });

      renderNowPlaying();
    });

    const $next = tinyLib.bs
      .button('outline-secondary')
      .addClass('btn-sm')
      .setAttr('title', 'Next track')
      .append(TinyHtml.createFrom('i').addClass('fas fa-forward'));

    $next.on('click', async () => {
      await sendPlayerAction({ action: 'track', trackIndex: state.trackIndex + 1 });
      renderNowPlaying();
    });

    // The room owner decides whether the playlist restarts or stops when the
    // last track ends.
    const $loop = tinyLib.bs
      .button(state.loop ? 'info' : 'outline-secondary')
      .addClass('btn-sm')
      .setAttr('title', state.loop ? 'Repeat: on' : 'Repeat: off')
      .append(TinyHtml.createFrom('i').addClass('fas fa-repeat'));

    $loop.on('click', async () => {
      await sendPlayerAction({ action: 'loop', loop: !state.loop });
      renderNowPlaying();
    });

    $nowPlaying.append(
      TinyHtml.createFrom('div')
        .addClass('alert alert-secondary mb-0 d-flex align-items-center gap-2')
        .append(
          TinyHtml.createFrom('i').addClass(state.playing ? 'fas fa-volume-high' : 'fas fa-pause'),
          TinyHtml.createFrom('div')
            .addClass('flex-grow-1 text-truncate')
            .setText(
              `${playlist?.name ?? state.playlistId} - ${track?.title || track?.id || ''} (${formatTime(getLivePosition(state))})`,
            ),
          $toggle,
          $next,
          $loop,
        ),
    );
  };

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

      const $play = tinyLib.bs
        .button(isCurrent ? 'success' : 'primary')
        .addClass('btn-sm')
        .setText(isCurrent ? 'Playing' : 'Play');

      $play.on('click', async () => {
        const result = await sendPlayerAction({
          action: 'playlist',
          playlistId: playlist.playlistId,
        });

        if (result) render();
      });

      const $actions = TinyHtml.createFrom('div').addClass('d-flex gap-1').append($play);

      if (canEdit) {
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
                    `${playlist.tracks.length} track(s) - ${
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

  $root.append(
    $error,
    $nowPlaying,
    TinyHtml.createFrom('div').addClass('d-flex gap-2').append($filter, $new),
    $list,
  );

  const { modal } = tinyLib.modal({
    title: 'Room playlists',
    dialog: 'modal-lg',
    id: 'room-player',
    body: $root,
  });

  const unsubscribe = onPlayerChange(() => {
    renderNowPlaying();
    render();
  });

  load();

  // The modal is rebuilt on every open, so the listener must not outlive it.
  document.addEventListener('hidden.bs.modal', () => unsubscribe(), { once: true });
};

export default openRoomPlayer;
