import { TinyHtml } from 'tiny-essentials';

/**
 * @typedef {Object} BootstrapPaginatorConstructor
 * @property {string} [containerClass=''] - CSS class for the outer container.
 * @property {'normal'|'large'|'small'|'mini'} [size='normal'] - Size of the pagination.
 * @property {'left'|'center'|'right'} [alignment='left'] - Alignment of the pagination.
 * @property {string} [listContainerClass=''] - CSS class for the UL element containing page items.
 * @property {function(type: string, page: number, current: number): string} [itemContainerClass] - Function returning CSS classes for each LI item.
 * @property {function(type: string, page: number, current: number): string} [itemContentClass] - Function returning CSS classes for each A element inside LI.
 * @property {number} [currentPage=1] - Initial page.
 * @property {number} [numberOfPages=5] - Number of visible pages at the same time.
 * @property {number} [totalPages=1] - Total number of pages.
 * @property {function(type: string, page: number, current: number): string|null} [pageUrl] - Function returning href for each page item (optional).
 * @property {function(event: Event, type: string, page: number): void} [onPageClicked] - Callback executed when any page item is clicked.
 * @property {function(lastPage: number, currentPage: number): void} [onPageChanged] - Callback executed when the current page changes.
 * @property {boolean} [useBootstrapTooltip=false] - Whether to use Bootstrap tooltip.
 * @property {function(type: string, page: number, current: number): boolean} [shouldShowPage] - Function to determine if a page item should be shown.
 * @property {function(type: string, page: number, current: number): string|number} [itemTexts] - Function returning the text content for each page item.
 * @property {function(type: string, page: number, current: number): string} [tooltipTitles] - Function returning the tooltip/title for each page item.
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
  /**
   * @param {HTMLElement|string|TinyHtml} element - Target container for the paginator.
   * @param {Object} [options={}] - Configuration options for paginator.
   */
  constructor(element, options = {}) {
    this.element = !(element instanceof TinyHtml)
      ? typeof element === 'string'
        ? TinyHtml.query(element)
        : new TinyHtml(element)
      : element;

    if (!this.element) throw new Error('BootstrapPaginator: Target element not found.');
    this.element.setData('BootstrapPaginator', this);

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
        }
      },
    };

    this.options = { ...this.defaults, ...options };
    this.currentPage = this.options.currentPage;
    this.lastPage = this.options.currentPage;
    this.totalPages = parseInt(this.options.totalPages, 10);
    this.numberOfPages = parseInt(this.options.numberOfPages, 10);

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
    this.currentPage = parseInt(page, 10);
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
    output.first = 1;
    output.prev = currentPage > 1 ? currentPage - 1 : 1;
    output.next = currentPage < totalPages ? currentPage + 1 : totalPages;
    output.last = totalPages;
    output.current = currentPage;
    output.total = totalPages;
    output.numberOfPages = numberOfPages;

    return output;
  }

  /**
   * Build an individual page item.
   * @param {'first'|'prev'|'next'|'last'|'page'} type - Item type.
   * @param {number} page - Page number for the item.
   * @returns {HTMLLIElement|null}
   */
  buildPageItem(type, page) {
    if (!this.options.shouldShowPage(type, page, this.currentPage)) return null;

    const li = document.createElement('li');
    li.className = `page-item ${this.options.itemContainerClass(type, page, this.currentPage)}`;

    const a = document.createElement('a');
    a.className = `page-link ${this.options.itemContentClass(type, page, this.currentPage)}`;
    a.innerHTML = this.options.itemTexts(type, page, this.currentPage);
    a.title = this.options.tooltipTitles(type, page, this.currentPage);

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
