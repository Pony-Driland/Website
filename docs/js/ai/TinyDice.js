/**
 * TinyDice is a self-contained class for creating animated 3D dice that roll with
 * randomized values and stylish cube-like animation using HTML and CSS.
 *
 *
 * Created by: Yasmin Seidel (JasminDreasond)
 * Co-developed with: ChatGPT (OpenAI) as coding assistant
 *
 *
 * This class supports:
 * - Custom number of dice
 * - Different maximum values per die
 * - Dynamic rendering and animation of dice
 *
 * Usage:
 *
 * // 1. Create an HTML container (e.g., a <div id="myDice"></div>)
 * const container = document.getElementById('myDice');
 *
 * // 2. Instantiate the class
 * const dice = new TinyDice(container);
 *
 * // 3. Roll the dice (optional arguments: maxValue, diceCount, perDieValues)
 * dice.roll(100, 3); // Rolls 3 dice with values from 1 to 100
 * dice.roll(100, 3, '6,12,20'); // Rolls 3 dice with custom max values: 6, 12, 20
 *
 * Public Methods:
 * - roll(maxValue, diceCount, perDieValues): Triggers a roll with optional config
 * - clearCubes(): Clears all dice from the display
 * - insertCube(result, max): Inserts a single die with result and max
 *
 * Private Methods:
 * - #createCube(result, max): Generates the DOM structure of a single animated cube
 * - getRollResult(...): Parses and returns configuration object
 */
class TinyDice {
  #cubeId = 0; // used for incremental z-index to avoid overlapping issues
  #diceBase;

  constructor(diceBase) {
    this.#diceBase = diceBase;
    this.#diceBase.classList.add('tiny-dice-body');
    this.diceArea = document.createElement('div');
    this.diceArea.classList.add('dice-area');
    this.#diceBase.appendChild(this.diceArea);
  }

  /**
   * Parses user input to extract how many dice to roll and their max values.
   * @param {number} maxValue - The default maximum value for dice (used if perDieValues is not given)
   * @param {number} diceCount - How many dice to roll
   * @param {string|Array<number>} perDieValues - Optional list of max values per die (comma-separated string or array)
   * @returns {{ count: number, maxGlobal: number, perDieData: number[] }}
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
   * Appends a single 3D dice cube to the DOM with animation.
   * @param {number} result - Final value to display on the front face
   * @param {number} max - Maximum possible value (used to randomize the other faces)
   */
  insertCube(result, max) {
    const cube = this.#createCube(result, max);
    this.diceArea.appendChild(cube);
  }

  /**
   * Clears all dice cubes from the display area.
   */
  clearCubes() {
    this.#cubeId = 0;
    this.diceArea.innerHTML = '';
  }

  /**
   * Internal function to create the cube DOM element with animation and faces.
   * @param {number} result - Value shown on front face
   * @param {number} max - Maximum possible value
   * @returns {HTMLElement} - DOM element of the cube container
   */
  #createCube(result, max) {
    // Container
    const container = document.createElement('div');
    container.className = 'dice-container';
    container.style.zIndex = 1000 + this.#cubeId++; // each dice with higher priority

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'cube-wrapper';

    // Get rot
    const rotX = 360 * (3 + Math.floor(Math.random() * 5));
    const rotY = 360 * (3 + Math.floor(Math.random() * 5));

    // Wrapper animation
    wrapper.style.animation = `spinCubeCustom 2s ease-in-out forwards`;
    wrapper.style.setProperty('--rotX', `${rotX}deg`);
    wrapper.style.setProperty('--rotY', `${rotY}deg`);

    // Create the cube
    for (let i = 1; i <= 6; i++) {
      const face = document.createElement('div');
      face.className = `face face${i}`;
      face.textContent = i !== 1 ? Math.floor(Math.random() * max) : result;
      wrapper.appendChild(face);
    }

    // Stop cube animation
    setTimeout(() => {
      wrapper.classList.add('stopped');
    }, 2000);

    // Insert the cube
    container.appendChild(wrapper);
    return container;
  }

  /**
   * Inserts multiple dice cubes into the DOM with proper values.
   * @param {number} count - Number of dice to insert
   * @param {number} maxGlobal - Default max value for dice
   * @param {number[]} perDieData - Optional array of max values per die
   */
  insertCubes(count, maxGlobal, perDieData) {
    for (let i = 0; i < count; i++) {
      const max = typeof perDieData[i] === 'number' ? perDieData[i] : maxGlobal;
      const result = Math.floor(Math.random() * max) + 1;
      this.insertCube(result, max);
    }
  }

  /**
   * Rolls the dice by clearing the previous ones and inserting new results.
   * @param {number} maxValue - Global max value (used if perDieValues is not set)
   * @param {number} diceCount - How many dice to roll
   * @param {string|Array<number>} perDieValues - Optional: individual max values
   */
  roll(maxValue, diceCount, perDieValues) {
    const { count, maxGlobal, perDieData } = this.getRollResult(maxValue, diceCount, perDieValues);
    this.clearCubes();
    this.insertCubes(count, maxGlobal, perDieData);
  }
}
