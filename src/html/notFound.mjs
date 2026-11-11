/*
 * 404 page.
 *
 * Rendered by the router when no route matches the current URL. It mirrors the
 * static `public/404.html` (same markup and classes), but it is rendered inside
 * the SPA so the user keeps the navbar and the history.
 *
 * @module html/notFound
 */

import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { markdownBase } from './base.mjs';

/**
 * Renders the 404 page.
 *
 * @returns {void}
 */
export const renderNotFound = () => {
  markdownBase.empty().append(
    TinyHtml.createFrom('div', { class: 'row h-100 m-0' }).append(
      TinyHtml.createFrom('div', { class: 'col-sm-12 my-auto' }).append(
        TinyHtml.createFrom('center').append(
          TinyHtml.createFrom('img', {
            src: '/img/error.png',
            class: 'img-fluid',
            alt: 'error',
          }),
          TinyHtml.createFrom('div', { class: 'flex-center position-ref' }).append(
            TinyHtml.createFrom('div', { class: 'code' }).append(
              TinyHtml.createFrom('strong').setText('ERROR 404'),
            ),
            TinyHtml.createFrom('div', {
              class: 'message mb-3 text-danger',
              style: 'padding: 10px;',
            }).append(
              'This page does not exist. You can go back to the ',
              TinyHtml.createFrom('a', { href: '/' }).setText('homepage'),
              ' or you can report this issue to the official ',
              TinyHtml.createFrom('a', {
                href: 'https://github.com/Pony-Driland/Website/issues',
                target: '_blank',
              }).setText('Github Repository'),
              '.',
            ),
          ),
        ),
      ),
    ),
  );
};
