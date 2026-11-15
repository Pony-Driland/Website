import { matchesNsfwExpression, NSFW_CHANGE_EVENT } from '../nsfw.mjs';

/**
 * Keeps the rendered `:::nsfw` blocks in sync with the reader settings.
 *
 * The markdown renderer already emits the correct branch, so this module only
 * has to re-evaluate the blocks when a filter changes (either in another tab or
 * in the mature content dialog).
 *
 * @module markdown/nsfw-runtime
 */

/**
 * Re-evaluates every mature content block inside the given root.
 *
 * A group holds every branch of a single `:::nsfw` block, so only the first
 * matching branch is visible. When no branch matches the whole group stays
 * hidden.
 *
 * @param {ParentNode} [root=document] - Subtree to update.
 * @returns {void}
 */
export const refreshNsfwBlocks = (root = document) => {
  /** @type {Set<Element>} */
  const groups = new Set();

  // Collect the groups first, so a branch is never evaluated twice.
  root.querySelectorAll('.nsfw-block').forEach((block) => {
    if (block.parentElement) groups.add(block.parentElement);
  });

  for (const group of groups) {
    let matched = false;

    group.querySelectorAll(':scope > .nsfw-block').forEach((block) => {
      const expression = block.getAttribute('data-nsfw') ?? '';
      const isMatch = !matched && matchesNsfwExpression(expression);
      if (isMatch) matched = true;
      block.toggleAttribute('hidden', !isMatch);
    });
  }
};

// A single listener is enough for the whole document, so it is registered as
// soon as this module is imported.
window.addEventListener(NSFW_CHANGE_EVENT, () => refreshNsfwBlocks());
