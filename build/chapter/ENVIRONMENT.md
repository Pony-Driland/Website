# Environment Settings

How to change the sky, the weather and the sound of the reader from inside a chapter file.

Every line of a chapter can carry a `set` object. The reader replays those objects from the top of the chapter up to the line you are reading, so the scene is always the result of everything that came before it.

```json
{
  "value": "The rain got heavier.",
  "type": "action",
  "set": {
    "weather": "heavyrain",
    "dayNightCycle": "night"
  }
}
```

> **Everything is optional.** A line without `set` inherits the previous state. A line with `set` only changes the keys it declares.

---

## Quick reference

| Key | Type | Values |
| --- | --- | --- |
| [`weather`](#weather) | `string` | `sun` `rain` `heavyrain` `bolt` `snow` `snowstorm` |
| [`weatherConfig`](#weatherconfig) | `object` | `{ speed, wind }` |
| [`dayNightCycle`](#daynightcycle) | `string` | `morning` `evening` `night` `lateAtNight` |
| [`moonPhase`](#moonphase) | `string` | `new` `waxing-crescent` `first-quarter` `waxing-gibbous` `full` `waning-gibbous` `last-quarter` `waning-crescent` `auto` |
| [`day`](#day) | `number` | `1`, `2`, `3`… |
| [`where`](#where) | `string` | Any location name |
| [`playlistPlay`](#playlistplay) | `string` | Playlist key |
| [`playEffect`](#playeffect) | `object` | `{ file, enabled, instant }` |

---

## `weather`

Sets the precipitation. The sky, the clouds and the ambient sound all follow.

```json
{ "set": { "weather": "heavyrain" } }
```

| Value | What the reader sees |
| --- | --- |
| `sun` | Clear sky. Clouds are still there, but sparse. |
| `rain` | Normal rain. |
| `heavyrain` | Dense rain, darker clouds, faster drops. |
| `bolt` | Violent storm. Fastest rain, strong wind, lightning strikes. |
| `snow` | Snow falling straight down. |
| `snowstorm` | Snow blown sideways by a strong wind. |

`weather` also starts and stops the matching ambient loop (`heavy-rain`, `heavy-rain-little-thunder`), so you usually do not need `playEffect` for rain.

---

## `weatherConfig`

Fine-tunes the current weather. Both fields are optional: whatever you omit keeps the preset default.

```json
{
  "set": {
    "weather": "snow",
    "weatherConfig": { "speed": 2.5, "wind": 0.8 }
  }
}
```

| Field | Range | Default | Description |
| --- | --- | --- | --- |
| `speed` | `0.1` – `6` | `1` | Multiplier for the fall speed. `1` is the preset, `2` is twice as fast. |
| `wind` | `0` – `1` | preset | Horizontal drift. `0` falls straight down, `1` is a gale. |

Out-of-range values are clamped, so a typo can never freeze the sky.

**Clearing the override** — send `null` to go back to the preset:

```json
{ "set": { "weatherConfig": null } }
```

> `weatherConfig` is applied on top of the preset, so `{ "weather": "snow", "weatherConfig": { "speed": 3 } }` gives you a fast snow that still uses the `snow` colours and density.

---

## `dayNightCycle`

Changes the sky gradient, the star intensity and the moon visibility.

```json
{ "set": { "dayNightCycle": "night" } }
```

| Value | Sky | Stars | Moon |
| --- | --- | --- | --- |
| `morning` | Blue, bright | no | no |
| `evening` | Orange, warm | faint | low |
| `night` | Deep blue | yes | yes |
| `lateAtNight` | Near black | yes | yes |

---

## `moonPhase`

Pins the shape of the moon.

```json
{ "set": { "moonPhase": "waxing-gibbous" } }
```

Accepted values: `new`, `waxing-crescent`, `first-quarter`, `waxing-gibbous`, `full`, `waning-gibbous`, `last-quarter`, `waning-crescent`.

### How the phase is applied

The moon **never changes shape while it is on screen**. If you set a new phase during a night scene, the reader waits until the moon is hidden and only then swaps it. This is deliberate: a disc that morphs in front of the reader breaks the illusion.

```
Line 100: { "dayNightCycle": "night" }        → moon appears (full)
Line 250: { "moonPhase": "new" }              → moon stays full, change is queued
Line 400: { "dayNightCycle": "morning" }      → moon hides, phase becomes "new"
Line 500: { "dayNightCycle": "night" }        → moon appears as "new"
```

### Per-night scope

A phase only applies to the night it was declared on. The reader counts nights with the [`day`](#day) key, so the next night falls back to the automatic phase unless you set it again.

```json
{ "set": { "day": 4, "dayNightCycle": "night", "moonPhase": "full" } }
```

Use `"auto"` to clear a previous override without waiting for a new night:

```json
{ "set": { "moonPhase": "auto" } }
```

---

## `day`

Increments the day counter. It also tells the reader that a new night has started, which is what resets the [moon phase](#moonphase).

```json
{ "set": { "day": 12 } }
```

---

## `where`

Shows the current location in the reader toolbar.

```json
{ "set": { "where": "Whicocesert Mountain" } }
```

---

## `playlistPlay`

Starts a music playlist. Send `null` to stop.

```json
{ "set": { "playlistPlay": "rainbow-queen-moment" } }
```

```json
{ "set": { "playlistPlay": null } }
```

---

## `playEffect`

Plays a one-shot or looping sound effect.

```json
{ "set": { "playEffect": { "file": "train-1", "enabled": true } } }
```

| Field | Type | Description |
| --- | --- | --- |
| `file` | `string` | Key from the sound config. |
| `enabled` | `boolean` | `true` starts, `false` stops. |
| `instant` | `boolean` | Skips the fade-in. |

```json
{ "set": { "playEffect": { "file": "train-1", "enabled": false } } }
```

---

## Full example

A storm that builds up, breaks, and leaves a clear night behind:

```json
[
  {
    "value": "The first drops hit the window.",
    "type": "action",
    "set": {
      "day": 7,
      "dayNightCycle": "evening",
      "where": "The bunker",
      "weather": "rain",
      "playlistPlay": "dark-ambient-melodies"
    }
  },
  {
    "value": "The storm was right above them now.",
    "type": "action",
    "set": {
      "weather": "bolt",
      "weatherConfig": { "speed": 1.4, "wind": 0.9 }
    }
  },
  {
    "value": "And then, as suddenly as it started, it stopped.",
    "type": "action",
    "set": {
      "weather": "sun",
      "weatherConfig": null,
      "dayNightCycle": "lateAtNight",
      "moonPhase": "waning-gibbous"
    }
  }
]
```

---

## Tuning the presets

If you are changing the look of a weather rather than using it, the values live in [`src/chapter_manager/weather/palettes.mjs`](../../src/chapter_manager/weather/palettes.mjs):

| Export | What it controls |
| --- | --- |
| `SKY_PALETTE_COLORS` | Gradient, star intensity and moon visibility per day/night cycle. |
| `WEATHER_PRESET_COLORS` | Rain, snow, cloud, wind and speed per weather key. |
| `MOON_PHASES` | The order of the phases. |
| `AUTO_MOON_PHASES` | Which phase each day/night cycle uses when the story is silent. |
| `WEATHER_LIMITS` | The clamp applied to `weatherConfig`. |

Adding a weather is a matter of adding a key to `WEATHER_PRESET_COLORS` and an icon to the `types` map in [`src/chapter_manager/updater.mjs`](../../src/chapter_manager/updater.mjs).
