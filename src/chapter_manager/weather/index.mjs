import { SKY_FRAGMENT_SHADER, SKY_VERTEX_SHADER } from './shaders.mjs';
import { getMoonPhase, resolveSkyState } from './presets.mjs';
import { createMoon } from './moon.mjs';

/**
 * Cloud texture, served from `public/`.
 *
 * It cannot be imported through the bundler: the file loader emits a relative
 * URL that the browser resolves against the current route (`/chapter/...`),
 * which 404s. A root relative path always points at the deployed asset.
 *
 * @type {string}
 */
const CLOUD_TEXTURE = '/img/bg/sky-stars/clouds3.png';

/**
 * GPU rendered sky used by the chapter reader.
 *
 * The old implementation spawned a few hundred `<div>` elements and animated
 * them with CSS keyframes, which forced the browser to repaint the whole
 * viewport on every frame. This module keeps a single `<canvas>` and one
 * full screen shader, so the weather costs one draw call and no layout work.
 *
 * The renderer is intentionally defensive: when WebGL is unavailable (or the
 * shader fails to compile) every method becomes a no-op and the reader keeps
 * working with a plain background.
 *
 * @module chapter_manager/weather
 */

/** Milliseconds used to fade between two weather states. */
const TRANSITION_DURATION = 1200;

/** Minimum time between two lightning flashes. */
const LIGHTNING_MIN_DELAY = 4000;

/** Maximum time between two lightning flashes. */
const LIGHTNING_MAX_DELAY = 14000;

/**
 * Envelope of a single lightning strike.
 *
 * The first entry is the leader (dim and short), the second is the return
 * stroke (the bright one) and the third is the afterglow that lights the
 * clouds from the inside.
 *
 * @type {{ delay: number, duration: number, strength: number }[]}
 */
const LIGHTNING_PULSES = [
  { delay: 0, duration: 90, strength: 0.55 },
  { delay: 90, duration: 130, strength: 1 },
  { delay: 260, duration: 420, strength: 0.45 },
];

/**
 * @typedef {Object} SkyUniforms
 * @property {WebGLUniformLocation|null} resolution
 * @property {WebGLUniformLocation|null} time
 * @property {WebGLUniformLocation|null} rain
 * @property {WebGLUniformLocation|null} snow
 * @property {WebGLUniformLocation|null} clouds
 * @property {WebGLUniformLocation|null} lightning
 * @property {WebGLUniformLocation|null} stars
 * @property {WebGLUniformLocation|null} wind
 * @property {WebGLUniformLocation|null} skyTop
 * @property {WebGLUniformLocation|null} skyBottom
 * @property {WebGLUniformLocation|null} moonPos
 * @property {WebGLUniformLocation|null} moonPhase
 * @property {WebGLUniformLocation|null} moonVisible
 * @property {WebGLUniformLocation|null} cloudTexture
 * @property {WebGLUniformLocation|null} cloudOffset
 * @property {WebGLUniformLocation|null} cloudReady
 * @property {WebGLUniformLocation|null} rainScroll
 * @property {WebGLUniformLocation|null} snowScroll
 * @property {WebGLUniformLocation|null} storm
 */

/**
 * Compiles a shader, returning `null` when the driver rejects it.
 *
 * @param {WebGLRenderingContext} gl - WebGL context.
 * @param {number} type - `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`.
 * @param {string} source - Shader source.
 * @returns {WebGLShader|null} Compiled shader.
 */
const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[weather] Shader compilation failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
};

/**
 * @typedef {Object} SkyRenderer
 * @property {() => void} start - Starts the render loop.
 * @property {() => void} stop - Stops the render loop.
 * @property {(weather?: string|null, dayCycle?: string|null, overrides?: { wind?: number, speed?: number }|null) => void} setState - Applies a weather state.
 * @property {(phase: string|number|null) => void} setMoonPhase - Changes the moon phase.
 * @property {() => void} destroy - Releases the WebGL resources.
 * @property {boolean} supported - Whether WebGL is available.
 * @property {string|number|null} moonPhase - Current moon phase.
 */

/**
 * Creates the sky renderer attached to the given canvas.
 *
 * @param {HTMLCanvasElement} canvas - Canvas that will host the sky.
 * @returns {SkyRenderer} Renderer instance.
 */
export const createSky = (canvas) => {
  /** @type {WebGLRenderingContext|null} */
  const gl = /** @type {WebGLRenderingContext|null} */ (
    canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    }) || canvas.getContext('experimental-webgl')
  );

  /** @type {SkyRenderer} */
  const api = {
    supported: !!gl,
    moonPhase: /** @type {string|number|null} */ (null),
    start: () => {},
    stop: () => {},
    setState: () => {},
    setMoonPhase: () => {},
    destroy: () => {},
  };

  if (!gl) {
    console.warn('[weather] WebGL is not available, the sky will stay static.');
    return api;
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, SKY_VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, SKY_FRAGMENT_SHADER);
  const program = gl.createProgram();

  if (!vertexShader || !fragmentShader || !program) {
    console.warn('[weather] Unable to build the sky shader, the sky will stay static.');
    return api;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[weather] Unable to link the sky shader:', gl.getProgramInfoLog(program));
    return api;
  }

  gl.useProgram(program);

  // Full screen triangle strip.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  /** @type {SkyUniforms} */
  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    time: gl.getUniformLocation(program, 'u_time'),
    rain: gl.getUniformLocation(program, 'u_rain'),
    snow: gl.getUniformLocation(program, 'u_snow'),
    clouds: gl.getUniformLocation(program, 'u_clouds'),
    lightning: gl.getUniformLocation(program, 'u_lightning'),
    stars: gl.getUniformLocation(program, 'u_stars'),
    wind: gl.getUniformLocation(program, 'u_wind'),
    skyTop: gl.getUniformLocation(program, 'u_skyTop'),
    skyBottom: gl.getUniformLocation(program, 'u_skyBottom'),
    moonPos: gl.getUniformLocation(program, 'u_moonPos'),
    moonPhase: gl.getUniformLocation(program, 'u_moonPhase'),
    moonVisible: gl.getUniformLocation(program, 'u_moonVisible'),
    cloudTexture: gl.getUniformLocation(program, 'u_cloudTexture'),
    cloudOffset: gl.getUniformLocation(program, 'u_cloudOffset'),
    cloudReady: gl.getUniformLocation(program, 'u_cloudReady'),
    rainScroll: gl.getUniformLocation(program, 'u_rainScroll'),
    snowScroll: gl.getUniformLocation(program, 'u_snowScroll'),
    storm: gl.getUniformLocation(program, 'u_storm'),
  };

  // Cloud texture.
  //
  // The texture is 1985x669, so it is NOT a power of two. WebGL 1 rejects
  // REPEAT on a NPOT texture and leaves it incomplete (sampling pure black),
  // which is why the tiling is done with fract() in the shader and the wrap
  // mode stays at CLAMP_TO_EDGE.
  const cloudTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  let cloudReady = 0;

  const cloudImage = new Image();
  cloudImage.crossOrigin = 'anonymous';
  cloudImage.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cloudImage);
    cloudReady = 1;
  };
  cloudImage.onerror = () => {
    console.error('[weather] Unable to load the cloud texture:', CLOUD_TEXTURE);
  };
  cloudImage.src = CLOUD_TEXTURE;

  let frame = 0;
  let running = false;
  let destroyed = false;
  let startedAt = 0;
  let lastFrame = 0;
  let lightningAt = 0;
  let lightningTimer = 0;
  let lightningIntensity = 0;
  let cloudOffset = 0;

  // Scroll offsets, in "screens scrolled". They are accumulated in double
  // precision and wrapped to 0..1 before being uploaded, which is what keeps
  // the precipitation from slowing down after a few minutes.
  const rainScroll = [0, 0, 0];
  const snowScroll = [0, 0, 0];

  /**
   * Base speed of each rain layer, in screens per second.
   *
   * 1.0 means the drop crosses the whole viewport in one second, which is what
   * the eye reads as falling rain. The presets scale this up for storms.
   */
  const RAIN_LAYER_SPEED = [0.75, 1.05, 1.45];

  /**
   * Base speed of each snow layer, in screens per second.
   *
   * Snow is an order of magnitude slower than rain and the layers are much
   * closer together, so the fall reads as calm and weightless. Only the
   * `snowstorm` preset pushes this up, through `snowSpeed`.
   */
  const SNOW_LAYER_SPEED = [0.022, 0.034, 0.05];

  // Interpolated values, so a weather change fades instead of popping.
  const current = { ...resolveSkyState(null, null) };
  const target = { ...resolveSkyState(null, null) };
  const from = { ...current };
  let transitionStart = 0;
  let transitionDuration = 0;

  /**
   * Resizes the drawing buffer to the CSS size of the canvas.
   *
   * The device pixel ratio is capped at 2 so a 4K monitor does not allocate a
   * 8K back buffer, but it is still respected, which is what keeps the sky
   * sharp on HiDPI and 2K/4K screens.
   *
   * @returns {void}
   */
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    // `clientWidth` is 0 while the canvas is still `display: none` (the reader
    // adds the class a tick later), so fall back to the viewport instead of
    // allocating a 1x1 buffer and drawing nothing.
    const cssWidth = canvas.clientWidth || window.innerWidth || 1;
    const cssHeight = canvas.clientHeight || window.innerHeight || 1;

    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
  };

  /**
   * Schedules the next lightning flash.
   *
   * @param {number} now - Current timestamp.
   * @returns {void}
   */
  const scheduleLightning = (now) => {
    lightningTimer =
      now + LIGHTNING_MIN_DELAY + Math.random() * (LIGHTNING_MAX_DELAY - LIGHTNING_MIN_DELAY);
  };

  /**
   * @param {number} now - Current timestamp.
   * @returns {void}
   */
  const render = (now) => {
    if (!running || destroyed) return;

    frame = requestAnimationFrame(render);

    // Cap the frame rate at ~30fps: the sky is a background, it does not need
    // to fight the reader for the GPU.
    if (now - lastFrame < 33) return;
    const delta = lastFrame ? Math.min(now - lastFrame, 100) : 16;
    lastFrame = now;

    if (!startedAt) startedAt = now;
    const elapsed = (now - startedAt) / 1000;

    // Clouds drift slowly to the side.
    cloudOffset = (cloudOffset + delta * 0.0000045) % 1;

    // Advance the precipitation. `delta` is in milliseconds, so the speeds are
    // converted to seconds here. The modulo keeps the values inside 0..1
    // forever, which is what the shader needs to stay precise.
    const seconds = delta / 1000;
    for (let i = 0; i < 3; i++) {
      rainScroll[i] = (rainScroll[i] + RAIN_LAYER_SPEED[i] * current.rainSpeed * seconds) % 1;
      snowScroll[i] = (snowScroll[i] + SNOW_LAYER_SPEED[i] * current.snowSpeed * seconds) % 1;
    }

    // Interpolate towards the target state.
    const progress =
      transitionDuration > 0 ? Math.min(1, (now - transitionStart) / transitionDuration) : 1;
    const eased = progress * progress * (3 - 2 * progress);

    current.rain = from.rain + (target.rain - from.rain) * eased;
    current.snow = from.snow + (target.snow - from.snow) * eased;
    current.clouds = from.clouds + (target.clouds - from.clouds) * eased;
    current.stars = from.stars + (target.stars - from.stars) * eased;
    current.moon = from.moon + (target.moon - from.moon) * eased;
    current.wind = from.wind + (target.wind - from.wind) * eased;
    current.storm = from.storm + (target.storm - from.storm) * eased;
    current.rainSpeed = from.rainSpeed + (target.rainSpeed - from.rainSpeed) * eased;
    current.snowSpeed = from.snowSpeed + (target.snowSpeed - from.snowSpeed) * eased;
    current.top = [
      from.top[0] + (target.top[0] - from.top[0]) * eased,
      from.top[1] + (target.top[1] - from.top[1]) * eased,
      from.top[2] + (target.top[2] - from.top[2]) * eased,
    ];
    current.bottom = [
      from.bottom[0] + (target.bottom[0] - from.bottom[0]) * eased,
      from.bottom[1] + (target.bottom[1] - from.bottom[1]) * eased,
      from.bottom[2] + (target.bottom[2] - from.bottom[2]) * eased,
    ];

    // Lightning only exists while the weather asks for it.
    if (target.lightning > 0) {
      if (!lightningTimer) scheduleLightning(now);
      else if (now >= lightningTimer) {
        lightningAt = now;
        lightningTimer = 0;
      }
    } else {
      lightningTimer = 0;
    }

    // A real strike is not a single pulse: the leader hits, the sky goes dark
    // for a moment and then the return stroke flashes brighter. Three decaying
    // pulses are enough to sell the effect.
    const sinceFlash = now - lightningAt;
    lightningIntensity = 0;
    for (let i = 0; i < LIGHTNING_PULSES.length; i++) {
      const pulse = LIGHTNING_PULSES[i];
      const age = sinceFlash - pulse.delay;
      if (age < 0 || age > pulse.duration) continue;
      const fade = 1 - age / pulse.duration;
      lightningIntensity = Math.max(lightningIntensity, fade * fade * pulse.strength);
    }

    resize();

    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform1f(uniforms.rain, current.rain);
    gl.uniform1f(uniforms.snow, current.snow);
    gl.uniform1f(uniforms.clouds, current.clouds);
    gl.uniform1f(uniforms.lightning, lightningIntensity);
    gl.uniform1f(uniforms.stars, current.stars);
    gl.uniform1f(uniforms.wind, current.wind);
    gl.uniform3f(uniforms.rainScroll, rainScroll[0], rainScroll[1], rainScroll[2]);
    gl.uniform3f(uniforms.snowScroll, snowScroll[0], snowScroll[1], snowScroll[2]);
    gl.uniform1f(uniforms.storm, current.storm);
    gl.uniform3f(uniforms.skyTop, current.top[0], current.top[1], current.top[2]);
    gl.uniform3f(uniforms.skyBottom, current.bottom[0], current.bottom[1], current.bottom[2]);

    // Moon, anchored to the top right corner.
    gl.uniform2f(uniforms.moonPos, 0.36, 0.34);
    gl.uniform1f(uniforms.moonPhase, getMoonPhase(api.moonPhase));
    gl.uniform1f(uniforms.moonVisible, current.moon);

    // Clouds.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
    gl.uniform1i(uniforms.cloudTexture, 0);
    gl.uniform1f(uniforms.cloudOffset, cloudOffset);
    gl.uniform1f(uniforms.cloudReady, cloudReady);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  api.start = () => {
    if (running || destroyed) return;
    running = true;
    lastFrame = 0;
    frame = requestAnimationFrame(render);
  };

  /**
   * @param {string|number|null} phase - Moon phase name or index.
   * @returns {void}
   */
  api.setMoonPhase = (phase) => {
    api.moonPhase = phase;
  };

  api.stop = () => {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  /**
   * @param {string|null} [weather] - Weather key.
   * @param {string|null} [dayCycle] - Day/night cycle key.
   * @param {{ wind?: number, speed?: number }|null} [overrides] - Motion overrides.
   * @returns {void}
   */
  api.setState = (weather = null, dayCycle = null, overrides = null) => {
    const next = resolveSkyState(weather, dayCycle, overrides ?? {});

    // Copy the values that are currently on screen, so a state change in the
    // middle of a transition does not jump.
    from.rain = current.rain;
    from.snow = current.snow;
    from.clouds = current.clouds;
    from.stars = current.stars;
    from.moon = current.moon;
    from.wind = current.wind;
    from.storm = current.storm;
    from.rainSpeed = current.rainSpeed;
    from.snowSpeed = current.snowSpeed;
    from.top = [...current.top];
    from.bottom = [...current.bottom];

    target.rain = next.rain;
    target.snow = next.snow;
    target.clouds = next.clouds;
    target.stars = next.stars;
    target.moon = next.moon;
    target.wind = next.wind;
    target.storm = next.storm;
    target.rainSpeed = next.rainSpeed;
    target.snowSpeed = next.snowSpeed;
    target.top = next.top;
    target.bottom = next.bottom;
    target.lightning = next.lightning;

    transitionStart = performance.now();
    transitionDuration = TRANSITION_DURATION;
  };

  api.destroy = () => {
    api.stop();
    destroyed = true;
    gl.deleteTexture(cloudTexture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  };

  return api;
};

/**
 * @typedef {Object} SkyController
 * @property {HTMLCanvasElement|null} canvas - Canvas that hosts the sky.
 * @property {SkyRenderer|null} renderer - Active renderer, if any.
 * @property {string|null} weather - Current weather key.
 * @property {string|null} dayCycle - Current day/night cycle key.
 * @property {{ wind?: number, speed?: number }|null} overrides - Motion overrides.
 * @property {ReturnType<typeof createMoon>|null} moon - Moon phase controller.
 * @property {number} night - Identifier of the current night.
 * @property {() => void} ensure - Creates the canvas once and keeps it alive.
 * @property {(weather?: string|null, dayCycle?: string|null) => void} setState - Applies a weather state.
 * @property {(overrides: { wind?: number, speed?: number }|null) => void} setOverrides - Overrides the motion.
 * @property {(phase: string|null) => void} setMoonPhase - Pins the moon phase for this night.
 * @property {() => void} nextNight - Starts a new night.
 * @property {() => void} syncMoon - Recomputes the moon phase.
 * @property {(visible: boolean) => void} setVisible - Shows or hides the sky.
 * @property {() => void} destroy - Removes the canvas and releases the GPU resources.
 * @property {() => boolean} isMounted - Whether the sky is currently mounted.
 */

/**
 * The sky lives directly inside `<body>` (and not inside the markdown container)
 * because the reader rebuilds its own DOM on every page change. Keeping the
 * canvas outside of it means the WebGL context survives the navigation.
 *
 * @type {SkyController}
 */
export const sky = {
  canvas: null,
  renderer: null,
  weather: null,
  dayCycle: null,
  overrides: null,
  moon: null,
  night: 0,

  /**
   * Creates the canvas and the WebGL context on first use.
   *
   * @returns {void}
   */
  ensure() {
    if (this.canvas) return;

    if (!this.moon) this.moon = createMoon();

    const canvas = document.createElement('canvas');
    canvas.className = 'sky-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    this.canvas = canvas;
    this.renderer = createSky(canvas);
    this.renderer.start();
    this.renderer.setMoonPhase(this.moon.get());
    this.renderer.setState(this.weather, this.dayCycle);
  },

  /**
   * @param {string|null} [weather] - Weather key.
   * @param {string|null} [dayCycle] - Day/night cycle key.
   * @returns {void}
   */
  setState(weather = null, dayCycle = null) {
    if (typeof weather === 'string') this.weather = weather;
    if (typeof dayCycle === 'string') this.dayCycle = dayCycle;

    // The reader updates the state on every scroll, including right after it
    // has been closed. Only the canvas owner is allowed to create it again.
    if (!this.canvas) return;
    if (this.renderer) this.renderer.setState(this.weather, this.dayCycle, this.overrides);

    // The moon may only change while it is hidden, so it has to be told about
    // every cycle change.
    this.syncMoon();
  },

  /**
   * Overrides how the precipitation moves.
   *
   * Both values are optional: whatever is omitted keeps the preset default, so
   * a line only has to declare what makes it different. Passing null clears
   * the override and restores the preset.
   *
   * @param {{ wind?: number, speed?: number }|null} overrides - Overrides.
   * @returns {void}
   */
  setOverrides(overrides) {
    this.overrides = overrides ?? null;
    if (this.renderer) this.renderer.setState(this.weather, this.dayCycle, this.overrides);
  },

  /**
   * Pins the moon phase for the current night.
   *
   * The phase is only committed while the moon is hidden, so the disc never
   * changes shape in front of the reader. Pass `null` to fall back to the
   * automatic phase of the day/night cycle.
   *
   * @param {string|null} phase - Phase name or `null`.
   * @returns {void}
   */
  setMoonPhase(phase) {
    if (!this.moon) this.moon = createMoon();
    this.moon.setManual(phase);
    this.syncMoon();
  },

  /**
   * Starts a new night, so the next phase is allowed to be picked again.
   *
   * @returns {void}
   */
  nextNight() {
    this.night++;
    if (this.moon) this.moon.reset();
  },

  /**
   * Recomputes the moon phase and forwards it to the renderer.
   *
   * @returns {void}
   */
  syncMoon() {
    if (!this.moon) return;

    const phase = this.moon.update(this.dayCycle, this.night);
    if (this.renderer) this.renderer.setMoonPhase(phase);
  },

  /**
   * @param {boolean} visible - Whether the sky must be visible.
   * @returns {void}
   */
  setVisible(visible) {
    document.body.classList.toggle('sky-visible', visible);
  },

  /**
   * @returns {void}
   */
  destroy() {
    if (this.renderer) this.renderer.destroy();
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.renderer = null;
    this.canvas = null;
    this.moon = null;
    this.night = 0;
    this.setVisible(false);
  },

  /**
   * @returns {boolean} Whether the sky is mounted.
   */
  isMounted() {
    return this.canvas !== null;
  },
};

export default sky;
