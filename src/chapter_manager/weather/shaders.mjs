/*
 * GLSL sources used by the WebGL sky.
 *
 * Everything (gradient, stars, moon, clouds, rain, snow and lightning) is drawn
 * by a single full screen fragment shader, so the whole weather costs one draw
 * call and zero layout work.
 *
 * The precipitation lives in its own module (`./shaders/rain` and
 * `./shaders/snow`) so the two never have to share a uniform or a helper.
 * This file only composes them into the final program.
 *
 * ## Why the scroll offsets are uniforms
 *
 * The precipitation used to do `p.y += u_time * speed`. That looks harmless,
 * but `u_time` grows forever and a GPU float only has 24 bits of mantissa (and
 * as little as 10 on the `mediump` fallback). After a minute the product is so
 * large that `fract()` no longer has any fractional bits left, the pattern
 * freezes and the rain visibly crawls.
 *
 * The offsets are therefore computed in JS with a double, wrapped to 0..1 and
 * uploaded as uniforms. Adding an integer to a scroll offset is invisible
 * because the shader only ever reads `fract(p)`, so wrapping is free.
 *
 * @module chapter_manager/weather/shaders
 */

import { RAIN_GLSL } from './shaders/rain.mjs';
import { SNOW_GLSL } from './shaders/snow.mjs';
import { SNOWSTORM_GLSL } from './shaders/snowstorm.mjs';

/** Full screen triangle strip. */
export const SKY_VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const SKY_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

// Weather intensities, all in the 0..1 range.
uniform float u_rain;
uniform float u_snow;
uniform float u_storm;
uniform float u_clouds;
uniform float u_lightning;
uniform float u_stars;
uniform float u_wind;

// Scroll offsets, already wrapped to 0..1 by the renderer. One component per
// depth layer, so every layer can move at its own speed without ever feeding a
// large number to the GPU.
uniform vec3 u_rainScroll;
uniform vec3 u_snowScroll;

// Sky gradient.
uniform vec3 u_skyTop;
uniform vec3 u_skyBottom;

// Moon.
uniform vec2 u_moonPos;
uniform float u_moonPhase;
uniform float u_moonVisible;

// Clouds.
uniform sampler2D u_cloudTexture;
uniform float u_cloudOffset;
uniform float u_cloudReady;

const float TAU = 6.28318530718;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2d(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

/**
 * Procedural cloud density.
 *
 * Four octaves of value noise, normalised back to the 0..1 range (the sum of
 * the amplitudes is 0.9375, so the raw value never reaches 1 without the
 * division).
 */
float cloudNoise(vec2 uv, float t) {
  vec2 p = vec2(uv.x * 2.4 + t * 0.004, uv.y * 3.4);
  float value = 0.0;
  float amplitude = 0.5;
  float total = 0.0;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise2d(p);
    total += amplitude;
    p *= 2.03;
    amplitude *= 0.5;
  }

  return clamp(value / total, 0.0, 1.0);
}

/**
 * Samples the seamless cloud texture with manual tiling.
 *
 * The texture is not a power of two, so WebGL 1 refuses to wrap it with
 * REPEAT. Tiling by hand with fract() keeps the texture complete.
 */
float cloudSample(vec2 uv) {
  return texture2D(u_cloudTexture, fract(uv)).a;
}

/** One layer of stars. */
float starLayer(vec2 uv, float density, float seed, float t) {
  vec2 p = uv * density;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;

  float rnd = hash21(id + seed);
  if (rnd < 0.86) return 0.0;

  vec2 offset = vec2(hash21(id + seed + 11.0), hash21(id + seed + 23.0)) - 0.5;
  float d = length(f - offset * 0.72);

  float size = 0.012 + 0.05 * hash21(id + seed + 37.0);
  float speed = 0.25 + 3.2 * hash21(id + seed + 53.0);
  float phase = hash21(id + seed + 71.0) * TAU;
  float twinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(t * speed + phase));

  return smoothstep(size, 0.0, d) * twinkle;
}

/**
 * Gusts: a slow, smooth wind modulation.
 *
 * Real rain never falls at a constant angle. Three sines at very different
 * speeds are enough to make the rain feel like it is being pushed around by
 * the same air the reader is imagining.
 */
float gust(float t) {
  return sin(t * 0.31) * 0.5 + sin(t * 0.13 + 1.7) * 0.3 + sin(t * 0.07 + 4.1) * 0.2;
}

${RAIN_GLSL}

${SNOW_GLSL}

${SNOWSTORM_GLSL}

/** Moon disc with its phase. */
float moonShape(vec2 p, float phase) {
  float radius = 0.5;
  float disc = 1.0 - smoothstep(radius - 0.01, radius, length(p));
  if (disc <= 0.0) return 0.0;

  float offset = mix(-1.35, 1.35, phase);
  float shadow = 1.0 - smoothstep(radius - 0.02, radius + 0.02, length(p - vec2(offset, 0.0)));

  return clamp(disc - shadow, 0.0, 1.0);
}

void main() {
  // Wrapping the clock keeps the hash inputs small on very long sessions.
  float t = mod(u_time, 600.0);

  vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));

  // Aspect corrected coordinates, used by every round shape.
  vec2 centered = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Sky gradient.
  vec3 color = mix(u_skyBottom, u_skyTop, smoothstep(0.0, 1.0, uv.y));

  // Stars.
  if (u_stars > 0.001) {
    float stars = 0.0;
    stars += starLayer(uv, 55.0, 0.0, t);
    stars += starLayer(uv, 90.0, 17.0, t) * 0.7;
    stars += starLayer(uv, 140.0, 41.0, t) * 0.45;
    color += vec3(0.88, 0.92, 1.0) * stars * u_stars;
  }

  // Moon. The 5.2 factor keeps it a small detail in the corner instead of a
  // huge disc competing with the text.
  if (u_moonVisible > 0.001) {
    vec2 moonUv = (centered - u_moonPos) * 5.2;
    float moon = moonShape(moonUv, u_moonPhase);
    float halo = (1.0 - smoothstep(0.0, 1.1, length(moonUv))) * 0.14;

    color += vec3(0.85, 0.89, 1.0) * halo * u_moonVisible * (0.35 + 0.65 * u_stars);
    color = mix(color, vec3(0.97, 0.97, 0.93), moon * u_moonVisible);
  }

  // Clouds.
  if (u_clouds > 0.001) {
    // Two texture layers scrolling at different speeds give the sky depth.
    vec2 cloudUvA = vec2(uv.x * 1.6 + u_cloudOffset, uv.y * 1.6);
    vec2 cloudUvB = vec2(uv.x * 2.4 + u_cloudOffset * 1.7 + 0.5, uv.y * 2.4 + 0.31);

    float cloudA = cloudSample(cloudUvA);
    float cloudB = cloudSample(cloudUvB);
    float cloud = clamp(cloudA * 0.85 + cloudB * 0.55, 0.0, 1.0);

    // The texture may still be loading (or missing). Blend in the procedural
    // version so the sky is never empty.
    float procedural = cloudNoise(uv, t);
    cloud = mix(procedural, max(cloud, procedural * 0.85), u_cloudReady);

    // Shape the density so the clouds have defined edges instead of a haze.
    cloud = smoothstep(0.18, 0.62, cloud);

    // Clouds are dark blue-grey at night and bright white during the day.
    float daylight = clamp(1.0 - u_stars, 0.0, 1.0);
    vec3 nightCloud = vec3(0.40, 0.46, 0.60);
    vec3 dayCloud = vec3(0.90, 0.93, 0.98);
    vec3 cloudColor = mix(nightCloud, dayCloud, daylight);

    // Moonlight rim: the clouds near the moon pick up a cool highlight, which
    // is what makes a real night sky readable.
    if (u_moonVisible > 0.001) {
      float moonDistance = length(centered - u_moonPos);
      float rim = 1.0 - smoothstep(0.0, 1.4, moonDistance);
      cloudColor += vec3(0.18, 0.22, 0.32) * rim * (1.0 - daylight);
    }

    // Lightning lights the clouds from the inside.
    cloudColor += vec3(0.55, 0.62, 0.85) * u_lightning * 0.8;

    float opacity = u_clouds * mix(0.85, 1.0, u_clouds);
    color = mix(color, cloudColor, cloud * opacity);
  }

  // Rain.
  //
  // Three depth layers. The far one is dense and faint, the near one is sparse
  // and bright, which is what sells the volume.
  if (u_rain > 0.001) {
    float rain = 0.0;
    rain += rainLayer(uv, 14.0, u_rainScroll.x, 3.1, 0.55, 0.012, 0.30) * 0.35;
    rain += rainLayer(uv, 26.0, u_rainScroll.y, 11.7, 0.60, 0.016, 0.34) * 0.60;
    rain += rainLayer(uv, 44.0, u_rainScroll.z, 27.3, 0.68, 0.022, 0.38) * 1.00;

    // Rain scatters the light, so it reads as a pale veil over the sky.
    color += vec3(0.62, 0.72, 0.90) * rain * u_rain * 0.85;

    // Splash haze near the bottom of the screen.
    float splash = smoothstep(0.35, 0.0, uv.y) * u_rain * 0.05;
    color += vec3(0.55, 0.65, 0.82) * splash;
  }

  // Snow. u_storm crossfades between the calm flakes and the storm, so a
  // scene can go from one to the other without a hard cut.
  //
  // Each branch is skipped when it contributes nothing, so a calm scene never
  // pays for the three extra storm layers and vice versa.
  if (u_snow > 0.001) {
    float snow = 0.0;

    if (u_storm < 0.999) {
      float calm = 0.0;
      calm += snowLayer(uv, 9.0, u_snowScroll.x, 2.3, 0.72, 0.055) * 0.45;
      calm += snowLayer(uv, 16.0, u_snowScroll.y, 7.9, 0.76, 0.070) * 0.70;
      calm += snowLayer(uv, 26.0, u_snowScroll.z, 19.1, 0.80, 0.085) * 1.00;
      snow += calm * (1.0 - u_storm);
    }

    if (u_storm > 0.001) {
      // Denser and finer than the calm snow: a blizzard is a wall of small
      // flakes, not a few big ones. The seeds are offset so the storm never
      // lines up with the calm field it is crossfading from.
      float storm = 0.0;
      storm += snowstormLayer(uv, 11.0, u_snowScroll.x, 61.3, 0.86, 0.048) * 0.45;
      storm += snowstormLayer(uv, 19.0, u_snowScroll.y, 83.7, 0.90, 0.060) * 0.70;
      storm += snowstormLayer(uv, 31.0, u_snowScroll.z, 107.1, 0.93, 0.074) * 1.00;
      snow += storm * u_storm;
    }

    color = mix(color, vec3(0.96, 0.97, 1.0), clamp(snow * u_snow, 0.0, 1.0));
  }

  // Lightning flash. The envelope is shaped in JS so it can flicker.
  color += vec3(0.85, 0.9, 1.0) * u_lightning * 0.55;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
