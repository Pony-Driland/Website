import { TinyHtml } from 'tiny-essentials';

/**
 * @typedef {Object} BootstrapPaginatorConstructor
 * @property {string} [containerClass=''] - CSS class for the outer container.
 * @property {'normal'|'large'|'small'|'mini'} [size='normal'] - Size of the pagination.
 * @property {'left'|'center'|'right'} [alignment='left'] - Alignment of the pagination.
 * @property {string} [listContainerClass=''] - CSS class for the UL element containing page items.
 * @property {(type: string, page: number, current: number) => string} [itemContainerClass] - Function returning CSS classes for each LI item.
 * @property {(type: string, page: number, current: number) => string} [itemContentClass] - Function returning CSS classes for each A element inside LI.
 * @property {number} [currentPage=1] - Initial page.
 * @property {number} [numberOfPages=5] - Number of visible pages at the same time.
 * @property {number} [totalPages=1] - Total number of pages.
 * @property {(type: string, page: number, current: number) => string|null} [pageUrl] - Function returning href for each page item (optional).
 * @property {((event: Event, type: string, page: number) => void) | null} [onPageClicked] - Callback executed when any page item is clicked.
 * @property {((lastPage: number, currentPage: number) => void) | null} [onPageChanged] - Callback executed when the current page changes.
 * @property {boolean} [useBootstrapTooltip=false] - Whether to use Bootstrap tooltip.
 * @property {(type: string, page: number, current: number) => boolean} [shouldShowPage] - Function to determine if a page item should be shown.
 * @property {(type: string, page: number, current: number) => string|number} [itemTexts] - Function returning the text content for each page item.
 * @property {(type: string, page: number, current: number) => string} [tooltipTitles] - Function returning the tooltip/title for each page item.
 */

/**
 * ## BootstrapPaginator Vanilla JS
 *
 * Rewritten version for TinyHtml
 * Based on the original bootstrap-paginator.js
 * by Yun Lai <lyonlai1984@gmail.com>
 * Refactored by Yasmin Seidel (JasminDreasond)
 */
class BootstrapPaginator {
  /** @type {BootstrapPaginatorConstructor} */
  options;

  /** @type {number} */
  currentPage;
  /** @type {number} */
  lastPage;
  /** @type {number} */
  totalPages;
  /** @type {number} */
  numberOfPages;

  /** @type {TinyHtml<any>} */
  element;

  /**
   * @param {HTMLElement|string|TinyHtml<any>} element - Target container for the paginator.
   * @param {Partial<BootstrapPaginatorConstructor>} [options={}] - Configuration options for paginator.
   */
  constructor(element, options = {}) {
    const elem = !(element instanceof TinyHtml)
      ? typeof element === 'string'
        ? TinyHtml.query(element)
        : new TinyHtml(element)
      : element;

    if (!elem) throw new Error('BootstrapPaginator: Target element not found.');
    this.element = elem;
    this.element.setData('BootstrapPaginator', this);

    /** @type {BootstrapPaginatorConstructor} */
    this.defaults = {
      containerClass: '',
      size: 'normal',
      alignment: 'left',
      listContainerClass: '',
      itemContainerClass: (type, page, current) => (page === current ? 'active' : ''),
      itemContentClass: () => '',
      currentPage: 1,
      numberOfPages: 5,
      totalPages: 1,
      pageUrl: () => null,
      onPageClicked: null,
      onPageChanged: null,
      useBootstrapTooltip: false,
      shouldShowPage: (type, page, current) => {
        switch (type) {
          case 'first':
            return current !== 1;
          case 'prev':
            return current !== 1;
          case 'next':
            return current !== this.totalPages;
          case 'last':
            return current !== this.totalPages;
          case 'page':
            return true;
          default:
            return false;
        }
      },
      itemTexts: (type, page, current) => {
        switch (type) {
          case 'first':
            return '«';
          case 'prev':
            return '‹';
          case 'next':
            return '›';
          case 'last':
            return '»';
          case 'page':
            return page;
          default:
            return '';
        }
      },
      tooltipTitles: (type, page, current) => {
        switch (type) {
          case 'first':
            return 'Go to first page';
          case 'prev':
            return 'Go to previous page';
          case 'next':
            return 'Go to next page';
          case 'last':
            return 'Go to last page';
          case 'page':
            return page === current ? `Current page is ${page}` : `Go to page ${page}`;
          default:
            return '';
        }
      },
    };

    this.options = { ...this.defaults, ...options };
    this.currentPage = this.options.currentPage ?? 1;
    this.lastPage = this.options.currentPage ?? 1;
    this.totalPages = this.options.totalPages ?? 1;
    this.numberOfPages = this.options.numberOfPages ?? 1;

    this.render();
  }

  /** ------------------ NAVIGATION METHODS ------------------ **/

  /**
   * Show a specific page.
   * @param {number} page - Page number to display.
   */
  show(page) {
    this.setCurrentPage(page);
    this.render();
    if (this.lastPage !== this.currentPage && this.options.onPageChanged) {
      this.options.onPageChanged(this.lastPage, this.currentPage);
    }
  }

  /** Show the next page if available. */
  showNext() {
    if (this.currentPage < this.totalPages) this.show(this.currentPage + 1);
  }

  /** Show the previous page if available. */
  showPrevious() {
    if (this.currentPage > 1) this.show(this.currentPage - 1);
  }

  /** Show the first page. */
  showFirst() {
    this.show(1);
  }

  /** Show the last page. */
  showLast() {
    this.show(this.totalPages);
  }

  /** ------------------ CORE ------------------ **/

  /**
   * Set the current active page.
   * @param {number} page - Page number to set.
   */
  setCurrentPage(page) {
    if (page < 1 || page > this.totalPages) throw new Error('Page out of range');
    this.lastPage = this.currentPage;
    this.currentPage = page;
  }

  /**
   * Get the list of visible pages around the current one.
   * Keeps the current page centered if possible.
   * @returns {Array<number> & {first:number, prev:number, next:number, last:number, current:number, total:number, numberOfPages:number}}
   */
  getPages() {
    const totalPages = this.totalPages;
    const numberOfPages = this.numberOfPages;
    const currentPage = this.currentPage;

    const half = Math.floor(numberOfPages / 2);

    let start = currentPage - half;
    let end = currentPage + half;

    // Ajusta para borda esquerda
    if (start < 1) {
      start = 1;
      end = Math.min(totalPages, start + numberOfPages - 1);
    }

    // Ajusta para borda direita
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - numberOfPages + 1);
    }

    const output = [];
    for (let i = start; i <= end; i++) {
      output.push(i);
    }

    // Metadados extras (mesmo formato do seu código anterior)
    // @ts-ignore
    output.first = 1;
    // @ts-ignore
    output.prev = currentPage > 1 ? currentPage - 1 : 1;
    // @ts-ignore
    output.next = currentPage < totalPages ? currentPage + 1 : totalPages;
    // @ts-ignore
    output.last = totalPages;
    // @ts-ignore
    output.current = currentPage;
    // @ts-ignore
    output.total = totalPages;
    // @ts-ignore
    output.numberOfPages = numberOfPages;

    // @ts-ignore
    return output;
  }

  /**
   * Build an individual page item.
   * @param {'first'|'prev'|'next'|'last'|'page'} type - Item type.
   * @param {number} page - Page number for the item.
   * @returns {HTMLLIElement|null}
   */
  buildPageItem(type, page) {
    if (!this.options.shouldShowPage || !this.options.shouldShowPage(type, page, this.currentPage))
      return null;

    const li = document.createElement('li');
    li.className = `page-item ${this.options.itemContainerClass ? this.options.itemContainerClass(type, page, this.currentPage) : ''}`;

    const a = document.createElement('a');
    a.className = `page-link ${this.options.itemContentClass ? this.options.itemContentClass(type, page, this.currentPage) : ''}`;
    a.innerHTML = this.options.itemTexts
      ? String(this.options.itemTexts(type, page, this.currentPage))
      : '';
    a.title = this.options.tooltipTitles
      ? this.options.tooltipTitles(type, page, this.currentPage)
      : '';

    if (this.options.pageUrl) {
      const href = this.options.pageUrl(type, page, this.currentPage);
      if (href) a.href = href;
    } else {
      a.href = 'javascript:void(0)';
    }

    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.options.onPageClicked) {
        this.options.onPageClicked(e, type, page);
      }
      switch (type) {
        case 'first':
          this.showFirst();
          break;
        case 'prev':
          this.showPrevious();
          break;
        case 'next':
          this.showNext();
          break;
        case 'last':
          this.showLast();
          break;
        case 'page':
          this.show(page);
          break;
      }
    });

    li.appendChild(a);
    return li;
  }

  /** Render the paginator UI. */
  render() {
    /** @type {(value: string) => boolean} */
    const classChecker = (value) => typeof value === 'string' && value.length > 0;
    const oldClasses = this.element.classList();
    if (oldClasses.length > 0 && oldClasses.every(classChecker))
      this.element.removeClass(...oldClasses);
    const newClasses = ` ${this.options.containerClass}`.trim().split(' ');
    if (newClasses.length > 0 && newClasses.every(classChecker))
      this.element.addClass(...newClasses);
    this.element.setHtml('');

    const ul = document.createElement('ul');
    ul.className = 'pagination ' + this.options.listContainerClass;

    const pages = this.getPages();

    if (pages.first) {
      const data = this.buildPageItem('first', pages.first);
      if (data) ul.appendChild(data);
    }

    if (pages.prev) {
      const data = this.buildPageItem('prev', pages.prev);
      if (data) ul.appendChild(data);
    }

    pages.forEach((p) => {
      const data = this.buildPageItem('page', p);
      if (data) ul.appendChild(data);
    });

    if (pages.next) {
      const data = this.buildPageItem('next', pages.next);
      if (data) ul.appendChild(data);
    }

    if (pages.last) {
      const data = this.buildPageItem('last', pages.last);
      if (data) ul.appendChild(data);
    }

    this.element.append(ul);
  }
}

export default BootstrapPaginator;
