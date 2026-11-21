/** Matches a line that only holds a closing `:::` fence. */
export const CLOSE_FENCE = /^:::[ \t]*$/;

/** Matches the opening line of a nested `:::` block. */
export const NESTED_OPEN = /^:::[a-zA-Z]/;

/**
 * Removes the trailing carriage return of a CRLF line.
 *
 * @param {string} line - Raw line.
 * @returns {string} The line without the trailing `\r`.
 */
export const stripCr = (line) => (line.endsWith('\r') ? line.slice(0, -1) : line);

/**
 * Collects the body of a `:::` fenced block.
 *
 * Nested `:::` blocks are tracked, so a `:::collapse` inside a `:::nsfw` (and
the other way around) is kept as content instead of closing the outer block.
 * Without this every extension would stop on the first `:::` it finds and the
two would break each other.
 *
 * @param {string[]} lines - Lines of the document.
 * @param {number} start - Index of the first body line.
 * @param {(line: string, depth: number) => boolean | void} onLine - Called for
 *   every body line with the nesting depth it was found at. Returning `false`
 *   stops the scan.
 * @param {(line: string) => boolean} [isSibling] - Tells that an opener is a
 *   sibling of the block being read (a new `:::nsfw` branch, for example)
 *   instead of a nested block. Siblings never change the nesting depth.
 * @returns {number} Index of the closing fence, or `-1` when it is missing.
 */
export function scanFence(lines, start, onLine, isSibling) {
  let depth = 0;

  for (let index = start; index < lines.length; index++) {
    const line = stripCr(lines[index]);

    // A closing fence only ends the block at the outermost level.
    if (CLOSE_FENCE.test(line)) {
      if (depth === 0) return index;
      depth--;
      if (onLine(line, depth) === false) return -1;
      continue;
    }

    // A sibling opener belongs to the current level, so it must not be counted
    // as a nested block.
    if (isSibling && isSibling(line)) {
      if (onLine(line, depth) === false) return -1;
      continue;
    }

    // A nested block keeps its own fences, so it is parsed again later.
    if (NESTED_OPEN.test(line)) {
      if (onLine(line, depth) === false) return -1;
      depth++;
      continue;
    }

    if (onLine(line, depth) === false) return -1;
  }

  return -1;
}

/**
 * Finds the end of a tag delimited block, honouring nested tags.
 *
 * `:::nsfw` and `:::collapse` use fences, but `<ai>` and `[spoiler]` use an
 * opening and a closing token. A naive non-greedy regex stops on the first
 * closing token, so a block nested inside another one would be cut in half.
 * This walks the string and only returns when the matching closing token is
 * found.
 *
 * @param {string} src - Markdown source, starting at the opening token.
 * @param {RegExp} open - Global regex matching the opening token.
 * @param {RegExp} close - Global regex matching the closing token.
 * @returns {{ body: string, end: number } | null} The raw body and the index
 *   right after the closing token, or `null` when the block is not closed.
 */
export function readTagBody(src, open, close) {
  // Both regexes are cloned so the caller can keep a shared instance.
  const openRe = new RegExp(open.source, open.flags.includes('g') ? open.flags : `${open.flags}g`);
  const closeRe = new RegExp(
    close.source,
    close.flags.includes('g') ? close.flags : `${close.flags}g`,
  );

  const first = openRe.exec(src);
  if (!first || first.index !== 0) return null;

  let depth = 1;
  let index = first[0].length;

  while (index <= src.length) {
    openRe.lastIndex = index;
    closeRe.lastIndex = index;

    const nextOpen = openRe.exec(src);
    const nextClose = closeRe.exec(src);

    // No closing token left, so the block is not terminated.
    if (!nextClose) return null;

    // Another block of the same kind starts first, so it must be closed too.
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      index = nextOpen.index + nextOpen[0].length;
      continue;
    }

    depth--;
    index = nextClose.index + nextClose[0].length;
    if (depth === 0) return { body: src.slice(first[0].length, nextClose.index), end: index };
  }

  return null;
}
