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
 * Replaces all dice patterns like `d5`, `d32`, etc. with corresponding values from an array.
 *
 * @param {string} input - The input string containing dice patterns.
 * @param {number[]} values - Array of numeric values to replace each dice pattern.
 * @returns {string} The resulting string with dice replaced by the provided values.
 */
export function replaceDiceValues(input, values) {
  let index = 0;

  return input.replace(/d\d+/g, () => {
    const value = values[index++];
    return value !== undefined ? value : 0; // Default to 0 if not enough values
  });
}

/**
 * Parses a dice configuration string supporting notations like "6d" (one d6) or "3d6" (three d6).
 * Extracts all valid dice expressions and keeps their full context as modifiers.
 *
 * @param {string} input - Comma-separated dice expressions.
 * @returns {{
 *   sides: { count: number, sides: number }[],
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

  /** @type {{ count: number, sides: number }[]} */
  const sides = [];

  /** @type {{ index: number, original: string, expression: string }[]} */
  const modifiers = [];

  parts.forEach((part, i) => {
    // ✅ Match dice patterns:
    // - 6d  → one d6
    // - 3d6 → three d6
    // - 12d100 → twelve d100
    const regex = /\b(?:(\d+)?d(\d+))\b/g;
    let match;
    const foundDice = [];

    while ((match = regex.exec(part)) !== null) {
      const count = parseInt(match[1] || '1', 10); // Default to 1 if not specified (e.g. "d6" or "6d")
      const sidesCount = parseInt(match[2], 10);

      if (isNaN(sidesCount)) {
        throw new Error(`Invalid dice sides in expression "${match[0]}" at position ${i + 1}.`);
      }

      foundDice.push({ count, sides: sidesCount });
    }

    if (foundDice.length === 0) {
      throw new Error(`Invalid dice expression at position ${i + 1}: "${part}"`);
    }

    // Add all found dice
    sides.push(...foundDice);

    // Store full expression
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
 * @param {number[]} list - Starting number (e.g., dice base value).
 * @param {{ expression: string }[]} modifiers - Parsed modifiers from parseDiceString.
 * @returns {{
 *   final: number,
 *   steps: { tokens: string[], rawTokens: string[], result: number, dices: Array<number[]> }[]
 * }}
 */
export function applyDiceModifiers(values, modifiers) {
  if (!Array.isArray(values) || !values.every((n) => typeof n === 'number' && !Number.isNaN(n)))
    throw new TypeError('Bases must be a valid numbers.');

  if (!Array.isArray(modifiers))
    throw new TypeError('Modifiers must be an array of modifier objects.');

  let result = 0;
  const steps = [];
  const iv = [...values];

  for (const index in modifiers) {
    const mod = modifiers[index];
    if (typeof mod.expression !== 'string') {
      throw new Error('Each modifier must include an expression string.');
    }

    /** @type {Array<number[]>} */
    const dices = [];
    const diceTokenSlots = [];
    const rawDiceTokenSlots = [];

    // Tokenize for manipulation or display
    const matchTokens = (value) => value.match(/\b\d*d\d+\b|[-+]?\d+(?:\.\d+)?|[+\-*/%^()]/g) || [];
    const rawTokens = matchTokens(mod.expression);
    const tokens = [...rawTokens];

    // ✅ Replace the first numeric literal (integer/decimal) that may be inside parentheses
    const replacedExpr = mod.expression.replace(/\b\d*d\d+\b/g, (m0) => {
      // Parse dice numbers
      const diceParsed = m0.split('d');
      const getRawTokenSlot = () => {
        for (const index in rawTokens) {
          if (rawTokens[index] === m0) {
            rawDiceTokenSlots.push(Number(index));
            break;
          }
        }
      };

      // 1dn
      if (diceParsed[0].trim().length === 0) {
        const r = iv.shift();
        dices.push([r]);

        for (const index in tokens) {
          if (tokens[index] === m0) {
            tokens[index] = String(r);
            diceTokenSlots.push(Number(index));
            break;
          }
        }

        getRawTokenSlot();
        return r;
      }

      // ndn
      /** @type {number[]} */
      const dices2 = [];
      const diceAmount = Number(diceParsed[0]);

      const newTokensInsert = ['('];
      let total = '(';
      for (let i = 0; i < diceAmount; i++) {
        const r = iv.shift();
        newTokensInsert.push(String(r));

        const finishSpace = i < diceAmount - 1 ? ' + ' : ')';
        newTokensInsert.push(finishSpace);

        total += `${r}${finishSpace}`;
        dices2.push(r);
      }

      for (const index in tokens) {
        if (tokens[index] === m0) {
          tokens.splice(index, 1, ...newTokensInsert);
          // Each new item a new string is added
          let amount = 1;
          for (let i2 = 0; i2 < diceAmount; i2++) {
            diceTokenSlots.push(Number(index) + i2 + amount);
            amount++;
          }
          break;
        }
      }
      dices.push(dices2);

      getRawTokenSlot();
      return total;
    });

    let evaluated;
    try {
      evaluated = safeEvaluate(replacedExpr);
    } catch (err) {
      throw new Error(
        `Error evaluating expression "${replacedExpr}" (from "${mod.expression}"): ${err.message}`,
      );
    }

    steps.push({
      rawTokens,
      tokens,
      rawDiceTokenSlots,
      diceTokenSlots,
      dicesResults: dices,
      result: evaluated,
    });

    result += evaluated;
  }

  // Complete
  console.log({
    final: result,
    steps,
  });
  return {
    final: result,
    steps,
  };
}
