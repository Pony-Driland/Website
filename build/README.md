# Build Folder

Inside this folder are stored scripts for building website files. This makes updating the website much faster and easier to perform.

Each folder can contain instructions on how to work. For more details you can find in the ".vscode" folder.

Don't forget to give credits if you want to use my fanfic website building system.

<hr/>

## Audio filter (`dist` only)

`npm run build` finishes by running [`merge-website.mjs`](./merge-website.mjs), which merges `public/` and
`dist/public/` into `dist/WEBSITE`. During that merge, [`audio-filter.mjs`](./audio-filter.mjs) removes
redundant heavy audio files **from the build output only** — `public/` is never modified.

A file is removed from `dist/WEBSITE` when **all** conditions are true:

1. It lives inside `public/audio`.
2. Its extension is a heavy one (`.wav`).
3. It is at least `3 MB` (smaller files are always shipped).
4. A lightweight version with the same base name exists in the same folder (`.mp3`, `.ogg`, `.m4a`, `.opus`, ...).

So a `song.wav` is dropped only when `song.mp3` exists next to it. A `.wav` with no alternative
(and every small `.wav`) is always copied.

### Metadata sync

Each music folder has a `data.json` with a `format` array (`["mp3", "wav"]`). After the copy,
every `data.json` inside `dist/WEBSITE/audio` is rewritten so `format` only lists the extensions
that actually exist in the folder. A track whose `.wav` was dropped becomes `"format": ["mp3"]`,
so the website never tries to load a file that was not shipped.

The rewrite is textual: only the `format` value changes, every other byte (indentation, key order,
line endings) is preserved. Folders that kept their `.wav` are not touched at all.

### Environment variables

| Variable                | Default | Description                                                       |
| ----------------------- | ------- | ----------------------------------------------------------------- |
| `AUDIO_FILTER`          | `on`    | Set to `off` to copy every audio file, disabling the filter.       |
| `AUDIO_SMALL_WAV_LIMIT` | `3`     | Size in MB below which a heavy file is always kept in the build.   |

```bash
# copy everything, exactly like before
AUDIO_FILTER=off npm run build

# only drop .wav files bigger than 10 MB
AUDIO_SMALL_WAV_LIMIT=10 npm run build
```

<hr/>

## Folders and files that can be modified

/build/characters/data

/public/chapters/en (Or whatever language you have set.)

/public/chapters/config.js

/public/img

/public/404.html

/public/ipfs-404.html

/public/manifest.json

/public/README.md