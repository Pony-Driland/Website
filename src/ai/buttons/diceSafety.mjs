import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import BootstrapPaginator from '../../modules/bootstrap-paginator.mjs';

/**
 * Safety rails for the dice roller.
 *
 * Every die is a CSS 3D cube made of six absolutely positioned faces with
 * `transform-style: preserve-3d` and a running keyframe animation. A single
 * `1000d6` would create 6.000 composited layers and freeze (or outright crash)
 * the tab, and the amount of dice comes straight from the server / from the
 * URL, so it cannot be trusted.
 *
 * The rule enforced here is simple: **the amount of dice in a roll is never the
 * amount of dice the browser renders at once**. The roll is always fully
 * computed (the total is what matters) and the visitor pages through the dice
 * instead of receiving all of them in a single frame.
 *
 * The 3D preview and the expression table share the same page, so page `N`
 * always means "the same dice" in both places. That is why both use
 * {@link DICE_PAGE_SIZE} and a shared {@link createPageGroup}.
 */

/**
 * Amount of dice (and table rows) rendered per page.
 * @type {number}
 */
export const DICE_PAGE_SIZE = 40;

/**
 * Maximum amount of dice accepted in a single roll.
 * @type {number}
 */
export const DICE_ROLL_LIMIT = 500;

/**
 * Amount of modifier steps rendered per page of the result table.
 *
 * It must match {@link DICE_PAGE_SIZE}: the table and the 3D preview are
 * paginated together, so a different size would desynchronise them.
 *
 * @type {number}
 */
export const DICE_STEP_PAGE_SIZE = DICE_PAGE_SIZE;

/**
 * Maximum amount of tokens rendered inside a single modifier step.
 * @type {number}
 */
export const DICE_TOKEN_LIMIT = 200;

/**
 * Plural helper.
 *
 * @param {number} amount - Amount to describe.
 * @param {string} [singular] - Singular noun.
 * @param {string} [plural] - Plural noun.
 * @returns {string} Formatted amount and noun.
 */
export const diceCountLabel = (amount, singular = 'die', plural = 'dice') =>
  `${amount} ${amount === 1 ? singular : plural}`;

/**
 * @typedef {Object} PageGroup
 * @property {() => number} getPage - Current page (1 based).
 * @property {(page: number) => void} setPage - Moves every subscriber to `page`.
 * @property {() => void} reset - Goes back to the first page without notifying.
 * @property {(listener: (page: number) => void) => () => void} subscribe - Listens to page changes.
 */

/**
 * Creates a page shared by several paginators.
 *
 * Every pager subscribed to the group shows the same page, so clicking on the
 * 3D dice paginator also moves the expression table (and the other way around).
 *
 * @returns {PageGroup} Page group.
 */
export const createPageGroup = () => {
  let page = 1;
  /** @type {Set<(page: number) => void>} */
  const listeners = new Set();

  return {
    getPage: () => page,

    setPage(next) {
      const value = Math.max(1, Math.floor(next) || 1);
      if (value === page) return;
      page = value;
      for (const listener of listeners) listener(page);
    },

    // A new roll always starts on the first page. The value is reset silently
    // because every pager is re-rendered by its owner right after.
    reset() {
      page = 1;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

/**
 * @typedef {Object} Pager
 * @property {import('tiny-essentials/libs/html/TinyHtml').TinyHtmlAny} element - Element that holds the paginator.
 * @property {(total: number, page?: number) => void} render - Rebuilds the paginator.
 * @property {() => number} getPage - Current page (1 based).
 * @property {() => number} getTotalPages - Amount of pages.
 */

/**
 * Builds a small paginator bound to a page group.
 *
 * The paginator is hidden while there is a single page, so callers can always
 * mount it without checking whether the list is long enough to be paged.
 *
 * @param {(page: number) => void} onChange - Called with the new page (1 based).
 * @param {{ numberOfPages?: number, className?: string, group?: PageGroup }} [options] - Pager options.
 * @returns {Pager} Pager controller.
 */
export const createPager = (onChange, options = {}) => {
  const numberOfPages = Math.max(1, Math.floor(options.numberOfPages ?? 5));
  const group = options.group ?? createPageGroup();
  const $element = TinyHtml.createFrom('div', {
    class: `d-flex justify-content-center ${options.className ?? ''}`.trim(),
  });

  let totalPages = 1;
  let current = 1;

  /**
   * Rebuilds the paginator.
   *
   * @param {number} total - Amount of pages.
   * @param {number} [page] - Page to select.
   * @returns {void}
   */
  const render = (total, page) => {
    totalPages = Math.max(1, Math.floor(total) || 1);
    const wanted = Math.floor(page ?? group.getPage()) || 1;
    current = Math.min(Math.max(1, wanted), totalPages);

    $element.empty();
    $element.toggleClass('d-none', totalPages <= 1);
    if (totalPages <= 1) return;

    new BootstrapPaginator($element, {
      listContainerClass: 'justify-content-center flex-wrap mb-0',
      currentPage: current,
      totalPages,
      numberOfPages,
      onPageChanged: (_lastPage, currentPage) => {
        current = currentPage;
        // Broadcast first: every other pager follows, then the owner renders.
        group.setPage(currentPage);
        onChange(currentPage);
      },
    });
  };

  // Follow the group. The `current` guard is what stops the echo of our own
  // click from rendering the same page twice.
  group.subscribe((page) => {
    const target = Math.min(page, totalPages);
    if (target === current) return;
    render(totalPages, target);
    onChange(target);
  });

  return {
    element: $element,
    render,
    getPage: () => current,
    getTotalPages: () => totalPages,
  };
};

/**
 * @typedef {Object} DiceLike
 * @property {() => void} clearDiceArea - Removes every rendered die.
 * @property {(value: number, sides: number, canZero?: boolean) => unknown} insertDiceElement - Renders one die.
 */

/**
 * @typedef {Object} DiceViewer
 * @property {import('tiny-essentials/libs/html/TinyHtml').TinyHtmlAny} element - Root element of the viewer.
 * @property {DiceLike} dice - TinyDices instance bound to the internal area.
 * @property {(results: unknown, canZero?: boolean) => void} setDice - Replaces the dice of the viewer.
 * @property {() => void} clear - Removes every die and hides the paginator.
 * @property {() => number} getPage - Current page (1 based).
 * @property {() => number} getTotalPages - Amount of pages of the current roll.
 */

/**
 * Builds a paginated 3D dice viewer.
 *
 * Only one page of dice exists in the DOM at a time, so a `500d6` costs the
 * same as a `40d6` after the first paint. The paginator is only shown when the
 * roll actually needs more than one page.
 *
 * The dice area is created here (and handed to `createDice`) so the cubes are
 * always rendered inside the element the paginator controls.
 *
 * @template {DiceLike} T
 * @param {(area: HTMLElement) => T} createDice - Factory of the TinyDices instance.
 * @param {{ pageSize?: number, group?: PageGroup }} [options] - Viewer options.
 * @returns {DiceViewer & { dice: T }} Viewer controller.
 */
export const createDiceViewer = (createDice, options = {}) => {
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? DICE_PAGE_SIZE));
  const group = options.group ?? createPageGroup();

  const $root = TinyHtml.createFrom('div', { class: 'dice-viewer' });
  const $dice = TinyHtml.createFrom('div');
  const $status = TinyHtml.createFrom('div', {
    class: 'small text-body-secondary text-center mt-2',
  });

  /** @type {Array<{ value: number, sides: number }>} */
  let items = [];
  let canZero = false;

  const pager = createPager((page) => renderPage(page), { group });

  $root.append($dice, pager.element, $status);

  const dice = createDice(/** @type {HTMLElement} */ ($dice.get(0)));

  /** @returns {number} Amount of pages of the current roll. */
  const getTotalPages = () => Math.max(1, Math.ceil(items.length / pageSize));

  /**
   * Renders the dice of the given page.
   *
   * @param {number} [page=1] - Page to render (1 based).
   * @returns {void}
   */
  function renderPage(page = 1) {
    dice.clearDiceArea();

    const start = (page - 1) * pageSize;
    const slice = items.slice(start, start + pageSize);

    for (const item of slice) {
      if (!item || typeof item.value !== 'number' || typeof item.sides !== 'number') continue;
      try {
        dice.insertDiceElement(item.value, item.sides, canZero);
      } catch (err) {
        // A single broken die must never take the whole roll down.
        console.error('[dice] failed to render a die', err);
      }
    }

    if (items.length === 0) {
      $status.setText('');
      return;
    }

    const first = start + 1;
    const last = Math.min(items.length, start + slice.length);
    $status.setText(`Showing ${first}-${last} of ${diceCountLabel(items.length)}.`);
  }

  /**
   * Replaces the dice of the viewer and goes back to the first page.
   *
   * @param {unknown} results - Dice of the roll.
   * @param {boolean} [zero=false] - Whether zero is a valid face.
   * @returns {void}
   */
  const setDice = (results, zero = false) => {
    items = Array.isArray(results) ? results.slice() : [];
    canZero = !!zero;
    // A new roll always starts on the first page, for every pager.
    group.reset();
    pager.render(getTotalPages(), 1);
    renderPage(1);
  };

  /** Removes every die and hides the paginator. */
  const clear = () => {
    items = [];
    dice.clearDiceArea();
    pager.render(1, 1);
    $status.setText('');
  };

  return {
    element: $root,
    dice,
    setDice,
    clear,
    getPage: () => pager.getPage(),
    getTotalPages,
  };
};
