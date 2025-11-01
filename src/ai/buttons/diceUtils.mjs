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
 * Example input: "6, 3*2+1, (1+5+3/6), 8/2-1, 4*(2+1)"
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
    // Match first numeric-like token (handles negatives and decimals)
    const baseMatch = part.match(/^[-+]?\d+(\.\d+)?/);
    if (!baseMatch) {
      throw new Error(`Invalid dice expression at position ${i + 1}: "${part}"`);
    }

    const base = parseFloat(baseMatch[0]);

    if (part !== String(base)) {
      modifiers.push({
        index: i,
        original: part,
        expression: part,
      });
    }

    sides.push(base);
  });

  return { sides, modifiers };
}

/**
 * Tokenizes a mathematical expression string into an array of parts.
 * Example: "10*2+(5/2)" => ["10", "*", "2", "+", "(", "5", "/", "2", ")"]
 *
 * @param {string} expr - Expression string.
 * @returns {string[]} Array of expression tokens.
 */
function tokenizeExpression(expr) {
  return (
    expr
      .match(/[-+]?\d+(\.\d+)?|[+\-*/%^()]/g)
      ?.map((t) => t.trim())
      .filter(Boolean) || []
  );
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
 *   steps: { replaced: string[], result: number }[]
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

    // Replace only the first numeric literal in the expression with current base
    const replacedExpr = mod.expression.replace(/^\s*[-+]?\d+(\.\d+)?/, String(result));

    // Tokenize for later manipulation
    const tokens = tokenizeExpression(replacedExpr);

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
