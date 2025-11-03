/**
 * Safely evaluates a mathematical expression (supports +, -, *, /, %, **, parentheses, fractions and decimals).
 * This function ensures only valid math characters are processed.
 *
 * @param {string} expression - Mathematical expression to evaluate.
 * @returns {number} The calculated numeric result.
 */
function safeEvaluate(expression) {
  // Sanitize and validate only allowed math-safe characters
  if (!/^[\d+\-*/%.()\s^]+$/.test(expression)) {
    throw new Error(`Invalid characters in expression: "${expression}"`);
  }

  // Normalize power operator: allow both ** and ^ for exponentiation
  const normalized = expression.replace(/\^/g, '**');

  try {
    // Create isolated, safe Function (no variables, only math ops)
    return Function(`"use strict"; return (${normalized})`)();
  } catch (err) {
    throw new Error(`Invalid expression "${expression}": ${err.message}`);
  }
}

/**
 * Parses a dice configuration string that may include full mathematical expressions.
 * It isolates all numeric values (even inside parentheses) into `sides`
 * and preserves the full expression as a modifier.
 *
 * Example:
 *   Input: "(6 + (7+2)) * 2"
 *   Output:
 *     sides: [6, 7, 2, 2]
 *     modifiers: [{ index: 0, original: "(6 + (7+2)) * 2", expression: "(6 + (7+2)) * 2" }]
 *
 * @param {string} input - Comma-separated dice expressions.
 * @returns {{
 *   sides: number[],
 *   modifiers: { index: number, original: string, expression: string }[]
 * }}
 */
export function parseDiceString(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string.');
  }

  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const sides = [];
  const modifiers = [];

  parts.forEach((part, i) => {
    // ✅ Match numbers correctly (integers or decimals)
    // - Allows negatives only if preceded by "(" or start of string
    // - Prevents capturing operators next to numbers like "+2"
    const numbers = [];
    const regex = /(?<=^|[^\d)])-?\d+(\.\d+)?/g;
    let match;
    while ((match = regex.exec(part)) !== null) {
      numbers.push(parseFloat(match[0]));
    }

    if (numbers.length === 0) {
      throw new Error(`Invalid dice expression at position ${i + 1}: "${part}"`);
    }

    // Convert found numbers to floats and add to sides
    sides.push(String(numbers[0]));

    // Always store the full expression as a modifier
    modifiers.push({
      index: i,
      original: part,
      expression: part,
    });
  });

  return { sides, modifiers };
}

/**
 * Applies parsed modifiers (expressions) to a base number.
 * Replaces only the first number in the expression with the current result
 * before evaluation. Returns an object containing a step-by-step history.
 *
 * @param {number} base - Starting number (e.g., dice base value).
 * @param {{ expression: string }[]} modifiers - Parsed modifiers from parseDiceString.
 * @returns {{
 *   final: number,
 *   steps: { tokens: string[], result: number }[]
 * }}
 *
 * @example
 * const mods = [{ expression: "(3 + 2) * (5 - 1)" }, { expression: "x * 2" }];
 * const output = applyDiceModifiers(4, mods);
 */
export function applyDiceModifiers(base, modifiers) {
  if (typeof base !== 'number' || isNaN(base)) {
    throw new TypeError('Base must be a valid number.');
  }
  if (!Array.isArray(modifiers)) {
    throw new TypeError('Modifiers must be an array of modifier objects.');
  }

  let result = base;
  const steps = [];

  for (const mod of modifiers) {
    if (typeof mod.expression !== 'string') {
      throw new Error('Each modifier must include an expression string.');
    }

    // ✅ Replace the first numeric literal (integer/decimal) that may be inside parentheses
    const replacedExpr = mod.expression.replace(/(?<=^|[^\d)])-?\d+(\.\d+)?/, String(result));

    // Tokenize for manipulation or display
    const tokens = replacedExpr.match(/[-+]?\d+(\.\d+)?|[+\-*/%^()]/g) || [];

    let evaluated;
    try {
      evaluated = safeEvaluate(replacedExpr);
    } catch (err) {
      throw new Error(
        `Error evaluating expression "${replacedExpr}" (from "${mod.expression}"): ${err.message}`,
      );
    }

    steps.push({
      tokens,
      result: evaluated,
    });

    result = evaluated;
  }

  return {
    final: result,
    steps,
  };
}
