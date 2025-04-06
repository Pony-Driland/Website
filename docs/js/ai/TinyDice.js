/**
 * TinyDice is a self-contained JavaScript class for rendering animated 3D dice
 * using HTML and CSS. It supports rolling dice with randomized values and smooth,
 * stylish cube animations.
 *
 * Created by: Yasmin Seidel (JasminDreasond)
 * Co-developed with: ChatGPT (OpenAI) as coding assistant
 *
 * Features:
 * - Custom number of dice
 * - Individual maximum values per die
 * - Dynamic rendering and animation of dice cubes
 *
 * Usage:
 *
 * // 1. Create an HTML container (e.g., <div id="myDice"></div>)
 * const container = document.getElementById('myDice');
 *
 * // 2. Instantiate the class
 * const dice = new TinyDice(container);
 *
 * // 3. Roll the dice (optional arguments: maxValue, diceCount, perDieValues, rollInfinity)
 * dice.roll(100, 3); // Rolls 3 dice with values from 1 to 100
 * dice.roll(100, 3, '6,12,20'); // Rolls 3 dice with max values: 6, 12, and 20
 * dice.roll(20, 2, null, true); // Rolls 2 d20s that spin infinitely
 *
 * Public Methods:
 * - roll(maxValue, diceCount, perDieValues, rollInfinity): Rolls the dice with optional configuration
 * - clearCubes(): Removes all dice from the display
 * - insertCube(result, max, rollInfinity): Inserts a single animated die cube
 *
 * Private Methods:
 * - #createCube(result, max, rollInfinity): Generates the DOM structure of a single 3D cube
 * - getRollResult(maxValue, diceCount, perDieValues): Parses input and returns config object
 */
class TinyDice {
  #cubeId = 0; // used for incremental z-index to avoid overlapping issues
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
   * @param {boolean} [rollInfinity=false] - Whether the die should spin indefinitely.
   * @returns {number[]} - An array representing the values on all six faces of the cube.
   */
  insertCube(result, max, rollInfinity) {
    const { cube, sequence } = this.#createCube(result, max, rollInfinity);
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
  #createCube(result, max, rollInfinity = false) {
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
    for (let i = 1; i <= 6; i++) {
      const face = document.createElement('div');
      face.className = `face face${i}`;
      // Ignored results
      if (i !== 1) {
        let roll;
        let extraValue = 0;
        let usingExtra = false;
        do {
          roll = !usingExtra ? Math.floor(Math.random() * max) + 1 : extraValue;
          if (usingExtra || sequence.length >= max) {
            if (extraValue >= max) {
              extraValue = 0;
              countSeq.clear();
            }
            extraValue++;
            usingExtra = true;
          }
        } while (countSeq.has(roll));
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
   * Inserts multiple dice cubes into the DOM using the specified configuration.
   *
   * @param {number} count - Number of dice to insert.
   * @param {number} maxGlobal - Default maximum value for dice (if no individual values are given).
   * @param {number[]} perDieData - Array of individual max values per die (optional).
   * @param {boolean} [rollInfinity=false] - Whether all dice should spin infinitely.
   * @returns {Array<{ result: number, sequence: number[] }>} - Array with results and face sequences for each die.
   */
  insertCubes(count, maxGlobal, perDieData, rollInfinity) {
    const cubes = [];
    for (let i = 0; i < count; i++) {
      const max = typeof perDieData[i] === 'number' ? perDieData[i] : maxGlobal;
      const result = Math.floor(Math.random() * max) + 1;
      cubes.push({ sequence: this.insertCube(result, max, rollInfinity), result });
    }
    return cubes;
  }

  /**
   * Rolls the dice by clearing existing cubes and inserting new ones.
   *
   * @param {number} maxValue - Default maximum value for all dice (used if perDieValues is not provided).
   * @param {number} diceCount - How many dice to roll.
   * @param {string|Array<number>} [perDieValues] - Optional: comma-separated string or array of individual max values.
   * @param {boolean} [rollInfinity=false] - Whether the dice should animate infinitely.
   * @returns {Array<{ result: number, sequence: number[] }>} - Array with results and face sequences for each die.
   */
  roll(maxValue, diceCount, perDieValues, rollInfinity) {
    const { count, maxGlobal, perDieData } = this.getRollResult(maxValue, diceCount, perDieValues);
    this.clearCubes();
    return this.insertCubes(count, maxGlobal, perDieData, rollInfinity);
  }
}
