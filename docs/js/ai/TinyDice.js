// import validateColor from "validate-color";

/**
 * TinyDice - JavaScript class for rendering animated 3D dice with HTML/CSS.
 *
 * Created by: Yasmin Seidel (JasminDreasond)
 * Co-developed with: ChatGPT (OpenAI) as coding assistant
 *
 * Features:
 * - Roll any number of dice
 * - Supports custom max values per die
 * - Optional spinning animation (infinite or ending)
 * - Dynamic cube generation and animation
 * - Option to include zero in rolls (canZero)
 *
 * Usage:
 * const container = document.getElementById('myDice');
 * const dice = new TinyDice(container);
 *
 * dice.roll(6, 3);                        // Rolls 3d6
 * dice.roll(100, 3, '6,12,20');           // Rolls d6, d12, and d20
 * dice.roll(10, 2, null, true);           // Rolls 2d10 with infinite spin
 * dice.roll(10, 2, null, false, true);    // Rolls 2d10 with values starting at 0
 *
 * Customization:
 * dice.setBgSkin('metal');                // Sets background skin
 * dice.setTextSkin('neon');               // Sets text skin
 * dice.setBorderSkin('2px solid glow');   // Sets border skin
 *
 * dice.getBgSkin();                       // Gets current or default background skin
 * dice.getTextSkin();                     // Gets current or default text skin
 * dice.getBorderSkin();                   // Gets current or default border skin
 */
class TinyDice {
  #cubeId = 0; // used for incremental z-index to avoid overlapping issues
  #defaultBgSkin = 'linear-gradient(135deg, #ff3399, #33ccff)';
  #defaultBorderSkin = '2px solid rgba(255, 255, 255, 0.2)';
  #defaultTextSkin = 'white';
  #bgSkin;
  #bgImg;
  #textSkin;
  #borderSkin;
  #diceBase;

  /**
   * Creates a new TinyDice instance attached to a specified HTML element.
   *
   * @param {HTMLElement} diceBase - The HTML container element where the dice will be rendered.
   */
  constructor(diceBase) {
    this.#diceBase = diceBase;
    this.#diceBase.classList.add('tiny-dice-body');
    this.diceArea = document.createElement('div');
    this.diceArea.classList.add('dice-area');
    this.#diceBase.appendChild(this.diceArea);
  }

  /**
   * Validates a background-image value restricted to safe data:image URLs only.
   *
   * @private
   * @param {string} value - The CSS background-image value.
   * @returns {boolean}
   */
  #isValidDataImage(value) {
    if (typeof value !== 'string') return false;

    const normalized = value.trim();

    // Only allow data:image/... base64 or URL-encoded images
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+\/=]+$/i;

    return dataUrlPattern.test(normalized);
  }

  /**
   * Validates a linear-gradient string to prevent unsafe or malformed styles.
   *
   * @private
   * @param {string} value - The CSS gradient string.
   * @returns {boolean}
   */
  #isValidLinearGradient(value) {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();

    // Must start with 'linear-gradient(' and end with ')'
    if (!normalized.startsWith('linear-gradient(') || !normalized.endsWith(')')) {
      return false;
    }

    // Block unsafe patterns
    const unsafePattern = /(url\s*\(|expression\s*\(|javascript:|<|>|data:)/i;
    if (unsafePattern.test(value)) {
      return false;
    }

    // Extract content inside the parentheses
    const content = value.slice(value.indexOf('(') + 1, -1).trim();
    if (!content) return false;

    // Safe split by commas outside of parentheses
    const parts = [];
    let buffer = '';
    let depth = 0;

    for (let char of content) {
      if (char === '(') depth++;
      if (char === ')') depth--;

      if (char === ',' && depth === 0) {
        parts.push(buffer.trim());
        buffer = '';
      } else {
        buffer += char;
      }
    }

    if (buffer.trim()) parts.push(buffer.trim());
    if (parts.length < 1) return false; // needs at least one component

    let colorCount = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // First item can optionally be a direction or angle
      if (i === 0 && /^(to\s+\w+|\d+deg|[+-]?\d+rad|[+-]?\d+turn)$/i.test(part)) {
        continue;
      }

      if (validateColor(part.trim())) {
        colorCount++;
      } else {
        // Extract possible color value before any stop (e.g. "red 20%" → "red")
        const colorCandidate = part.trim().split(/\s+/)[0];

        if (validateColor(colorCandidate)) {
          colorCount++;
        } else {
          return false; // invalid color
        }
      }
    }

    // Must have at least 1 valid color and no more than 50
    return colorCount >= 1 && colorCount <= 50;
  }

  /**
   * Validates a CSS border string like '1px solid red' or '2px dashed linear-gradient(...)'.
   *
   * @private
   * @param {string} value - The CSS border string.
   * @returns {boolean}
   */
  #isValidCssBorder(value) {
    if (typeof value !== 'string') return false;

    const parts = value.trim().split(/\s+/);
    if (parts.length < 3) return false;

    const [width, style, ...colorParts] = parts;
    const color = colorParts.join(' ');

    // Validate width (basic check for length units)
    const isValidWidth = /^(\d+(\.\d+)?)(px|em|rem|%)$/.test(width);
    if (!isValidWidth) return false;

    // Validate border style
    const validStyles = [
      'none',
      'solid',
      'dashed',
      'dotted',
      'double',
      'groove',
      'ridge',
      'inset',
      'outset',
      'hidden',
    ];
    if (!validStyles.includes(style)) return false;

    // Validate color (either direct or linear-gradient)
    return validateColor(color) || this.#isValidLinearGradient(color);
  }

  /**
   * Sets the background image using a `data:` URL or, optionally, a standard image URL if forced.
   *
   * For security reasons, only `data:` URLs are accepted by default to avoid external resource injection.
   * You can override this restriction using the `forceUnsafe` flag, but this is discouraged unless trusted.
   *
   * @public
   * @param {string|null} value - The background-image URL (must be a `data:` image by default).
   * @param {boolean} [forceUnsafe=false] - Allows setting non-data URLs if true (use with caution).
   */
  setBgImg(value, forceUnsafe = false) {
    this.#bgImg =
      typeof value === 'string' && (forceUnsafe || this.#isValidDataImage(value)) ? value : null;
  }

  /**
   * Returns the currently set background image if valid, or null.
   *
   * @public
   * @returns {string|null} - The current background-image value (data:image URL) or null if none is set.
   */
  getBgImg() {
    return this.#bgImg || null;
  }

  /**
   * Sets the background skin style if it's a valid CSS color or linear-gradient.
   * Prevents injection of unsafe or malformed styles.
   *
   * @param {string} skin - A valid CSS color string or gradient.
   */
  setBgSkin(skin) {
    if (typeof skin !== 'string') {
      this.#bgSkin = null;
      return;
    }

    const trimmed = skin.trim();
    const isGradient = this.#isValidLinearGradient(trimmed);
    const isColor = validateColor(trimmed);

    this.#bgSkin = isGradient || isColor ? trimmed : null;
  }

  /**
   * Gets the currently applied background skin.
   * @returns {string} The current background skin, or the default if not set.
   */
  getBgSkin() {
    return this.#bgSkin || this.#defaultBgSkin;
  }

  /**
   * Sets the text skin (style) of the dice numbers.
   * @param {string|null} skin - The skin name to apply to the text. Pass null or non-string to reset to default.
   */
  setTextSkin(skin) {
    this.#textSkin = typeof skin === 'string' && validateColor(skin) ? skin : null;
  }

  /**
   * Gets the currently applied text skin.
   * @returns {string} The current text skin, or the default if not set.
   */
  getTextSkin() {
    return this.#textSkin || this.#defaultTextSkin;
  }

  /**
   * Sets the border skin (style) of the dice edges.
   * @param {string|null} skin - The skin name to apply to the border. Pass null or non-string to reset to default.
   */
  setBorderSkin(skin) {
    this.#borderSkin = typeof skin === 'string' && this.#isValidCssBorder(skin) ? skin : null;
  }

  /**
   * Gets the currently applied border skin.
   * @returns {string} The current border skin, or the default if not set.
   */
  getBorderSkin() {
    return this.#borderSkin || this.#defaultBorderSkin;
  }

  /**
   * Generates a random integer between 1 and max (inclusive).
   * If `canZero` is true, the range becomes 0 to max (inclusive).
   *
   * @private
   * @param {number} max - The maximum value for the roll (inclusive).
   * @param {boolean} [canZero=false] - Whether the result can include 0.
   * @returns {number} A random integer between 1 and max, or 0 and max if `canZero` is true. Returns 0 if max <= 0.
   */
  #rollNumber(max = 0, canZero = false) {
    if (max > 0) {
      let maxValue = max;
      let finalValue = 1;
      if (canZero) {
        maxValue++;
        finalValue--;
      }
      return Math.floor(Math.random() * maxValue) + finalValue;
    } else return 0;
  }

  /**
   * Parses input parameters to determine the dice configuration.
   *
   * @param {number} maxValue - Default maximum value for all dice (used when perDieValues is not provided).
   * @param {number} diceCount - How many dice to roll.
   * @param {string|Array<number>} perDieValues - Optional: a comma-separated string or array of individual max values.
   * @returns {{ count: number, maxGlobal: number, perDieData: number[] }} - Parsed dice configuration.
   */
  getRollConfig(maxValue = 0, diceCount = 0, perDieValues = '') {
    // Get count
    const count = typeof diceCount === 'number' ? diceCount : 1;
    const maxGlobal = typeof maxValue === 'number' ? maxValue : 100;

    // Get per die data
    const perDieData =
      typeof perDieValues === 'string' && perDieValues.length > 0
        ? perDieValues
            .trim()
            .split(',')
            .map((val) => parseInt(val.trim(), 10))
            .filter((n) => !Number.isNaN(n) && n > 0)
        : Array.isArray(perDieValues)
          ? perDieValues
          : [];

    // Complete
    return { count, maxGlobal, perDieData };
  }

  /**
   * Inserts a single 3D die into the DOM with animation.
   *
   * @param {number} result - The value displayed on the front face of the die.
   * @param {number} max - The maximum value for the die (used to generate other random faces).
   * @param {boolean} [canZero=false] - Whether 0 is a valid face value.
   * @param {boolean} [rollInfinity=false] - Whether the die should spin indefinitely.
   * @returns {number[]} - An array representing the values on all six faces of the cube.
   */
  insertDiceElement(result, max, canZero, rollInfinity) {
    const { cube, sequence } = this.#createCube(result, max, canZero, rollInfinity);
    this.diceArea.appendChild(cube);
    return sequence;
  }

  /**
   * Clears all dice cubes from the display area.
   * Resets internal cube counter to avoid z-index conflicts.
   */
  clearDiceArea() {
    this.#cubeId = 0;
    this.diceArea.innerHTML = '';
  }

  /**
   * Creates a cube DOM element with animated faces and randomized values.
   *
   * @private
   * @param {number} result - The main value to appear on the front face.
   * @param {number} max - The maximum possible value for the die.
   * @param {boolean} [rollInfinity=false] - If true, the cube will spin infinitely.
   * @returns {{ cube: HTMLElement, sequence: number[] }} - The cube element and an array of all face values.
   */
  #createCube(result, max, canZero = false, rollInfinity = false) {
    // Container
    const container = document.createElement('div');
    container.className = 'dice-container';
    container.style.zIndex = 1000 + this.#cubeId++; // each dice with higher priority

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = `cube-wrapper${rollInfinity ? ` spin-infinite` : ''}`;

    // Get rot
    const rotX = 360 * (3 + Math.floor(Math.random() * 5));
    const rotY = 360 * (3 + Math.floor(Math.random() * 5));

    // Wrapper animation
    wrapper.style.animation = `spinCubeCustom 2s ease-in-out forwards`;
    wrapper.style.setProperty('--rotX', `${rotX}deg`);
    wrapper.style.setProperty('--rotY', `${rotY}deg`);

    // Create the cube
    const sequence = [];
    const countSeq = new Set();
    const min = !canZero ? 0 : -1;
    for (let i = 1; i <= 6; i++) {
      // Element
      const face = document.createElement('div');
      face.className = `face face${i}`;

      // Skin
      face.style.background = this.getBgSkin();
      face.style.color = this.getTextSkin();
      face.style.border = this.getBorderSkin();

      // Background image
      const bgImg = this.getBgImg();
      if (bgImg) {
        face.style.backgroundImage = `url("${bgImg}")`;
        face.style.backgroundPosition = 'center';
        face.style.backgroundSize = '100%';
        face.style.backgroundRepeat = 'repeat';
      }

      // Ignored results
      if (i !== 1) {
        let roll;
        // Normal max
        if (max > min) {
          let extraValue = min;
          let usingExtra = false;
          do {
            roll = !usingExtra ? this.#rollNumber(max, canZero) : extraValue;
            if (usingExtra || sequence.length >= max) {
              if (extraValue >= max) {
                extraValue = min;
                countSeq.clear();
              }
              extraValue++;
              usingExtra = true;
            }
          } while (countSeq.has(roll));
        }
        // 0 or negative max
        else roll = max;

        // Insert sequence
        sequence.push(roll);
        countSeq.add(roll);
        face.textContent = roll;
      }
      // The result!
      else {
        face.textContent = result;
        sequence.push(result);
        countSeq.add(result);
      }
      // Side added
      wrapper.appendChild(face);
    }

    // Stop cube animation
    if (!rollInfinity) {
      setTimeout(() => {
        if (wrapper) wrapper.classList.add('stopped');
      }, 2000);
    }

    // Insert the cube
    container.appendChild(wrapper);
    return { cube: container, sequence };
  }

  /**
   * Inserts a single die cube into the DOM using the specified configuration.
   *
   * @param {number} max - Default maximum value for dice (if no individual values are given).
   * @param {boolean} [canZero=false] - Whether 0 is a valid result.
   * @param {boolean} [rollInfinity=false] - Whether all dice should spin infinitely.
   * @returns {{ result: number, sequence: number[] }} - Array with results and face sequences for each die.
   */
  rollDice(max, canZero = false, rollInfinity = undefined) {
    const result = this.#rollNumber(max, canZero);
    return {
      sequence: this.insertDiceElement(result, max, canZero, rollInfinity),
      result,
    };
  }

  /**
   * Inserts multiple dice cubes into the DOM using the specified configuration.
   *
   * @param {number} count - Number of dice to insert.
   * @param {number} maxGlobal - Default maximum value for dice (if no individual values are given).
   * @param {number[]} perDieData - Optional: Array of individual max values per die.
   * @param {boolean} [canZero=false] - Whether 0 is a valid result on any die.
   * @param {boolean} [rollInfinity=false] - Whether all dice should spin infinitely.
   * @returns {Array<{ result: number, sequence: number[] }>} - Array with results and face sequences for each die.
   */
  rollDices(count, maxGlobal, perDieData, canZero = false, rollInfinity = undefined) {
    const cubes = [];
    for (let i = 0; i < count; i++) {
      const max =
        Array.isArray(perDieData) && typeof perDieData[i] === 'number' ? perDieData[i] : maxGlobal;
      const result = this.#rollNumber(max, canZero);
      cubes.push({
        sequence: this.insertDiceElement(result, max, canZero, rollInfinity),
        result,
      });
    }
    return cubes;
  }

  /**
   * Rolls the dice by clearing existing cubes and inserting new ones.
   *
   * @param {number} maxValue - Default maximum value for all dice (used if perDieValues is not provided).
   * @param {number} diceCount - How many dice to roll.
   * @param {string|Array<number>} [perDieValues] - Optional: comma-separated string or array of individual max values.
   * @param {boolean} [canZero=false] - Whether 0 is a valid result.
   * @param {boolean} [rollInfinity=false] - Whether dice spin infinitely.
   * @returns {Array<{ result: number, sequence: number[] }>} - Array with results and face sequences for each die.
   */
  roll(maxValue, diceCount, perDieValues, canZero, rollInfinity) {
    const { count, maxGlobal, perDieData } = this.getRollConfig(maxValue, diceCount, perDieValues);
    this.clearDiceArea();
    return this.rollDices(count, maxGlobal, perDieData, canZero, rollInfinity);
  }
}
