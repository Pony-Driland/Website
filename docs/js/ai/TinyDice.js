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
   * Sets the background skin of the dice.
   * @param {string|null} skin - The skin name to apply as background. Pass null or non-string to reset to default.
   */
  setBgSkin(skin) {
    this.#bgSkin = typeof skin === 'string' ? skin : null;
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
    this.#textSkin = typeof skin === 'string' ? skin : null;
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
    this.#borderSkin = typeof skin === 'string' ? skin : null;
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
  getRollResult(maxValue = 0, diceCount = 0, perDieValues = '') {
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
  insertCubeElement(result, max, canZero, rollInfinity) {
    const { cube, sequence } = this.#createCube(result, max, canZero, rollInfinity);
    this.diceArea.appendChild(cube);
    return sequence;
  }

  /**
   * Clears all dice cubes from the display area.
   * Resets internal cube counter to avoid z-index conflicts.
   */
  clearCubes() {
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
      const face = document.createElement('div');
      face.className = `face face${i}`;
      face.style.background = this.getBgSkin();
      face.style.color = this.getTextSkin();
      face.style.border = this.getBorderSkin();
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
  insertCube(max, canZero = false, rollInfinity = undefined) {
    const result = this.#rollNumber(max, canZero);
    return {
      sequence: this.insertCubeElement(result, max, canZero, rollInfinity),
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
  insertCubes(count, maxGlobal, perDieData, canZero = false, rollInfinity = undefined) {
    const cubes = [];
    for (let i = 0; i < count; i++) {
      const max = typeof perDieData[i] === 'number' ? perDieData[i] : maxGlobal;
      const result = this.#rollNumber(max, canZero);
      cubes.push({
        sequence: this.insertCubeElement(result, max, canZero, rollInfinity),
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
    const { count, maxGlobal, perDieData } = this.getRollResult(maxValue, diceCount, perDieValues);
    this.clearCubes();
    return this.insertCubes(count, maxGlobal, perDieData, canZero, rollInfinity);
  }
}
