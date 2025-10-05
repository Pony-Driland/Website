import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import PhotoSwipeLightbox from 'photoswipe';
import { Tooltip } from '../modules/TinyBootstrap.mjs';
import { tinyLs } from '../important.mjs';

/**
 * Fix file urls
 *
 * @param {(file: string|null) => void} callback
 * @returns {(item: TinyHtml<any>) => void}
 */
export const fixFileUrl = (callback) => (item) => {
  item.removeAttr('target').on('click', () => callback(item.attr('file')));
};

/**
 * Fix external page urls
 *
 * @param {TinyHtml<any>} item
 */
export const fixHref = (item) => {
  const href = item.attrString('href');
  if (typeof href === 'string' && (href.startsWith('http://') || href.startsWith('https://'))) {
    const url = new URL(href);
    if (url.host !== location.host) {
      item.setAttr('target', '_blank');
    }
  }
};

/**
 * Image content fix
 *
 * @param {TinyHtml<any>} item
 */
export const fixImageSrc = (item) => {
  if (item.parents('a').length > 0) {
    // New Image Item
    const src = item.attr('src');
    const originalHeight = item.attrNumber('height');
    const originalWidth = item.attrNumber('width');
    const newImage = TinyHtml.createFrom('img', { class: 'img-fluid' })
      .setStyle('height', originalHeight)
      .setStyle('width', originalWidth);
    item.replaceWith(newImage);

    // Load Image File
    newImage
      .setStyle({
        cursor: 'pointer',
        opacity: '0%',
        'pointer-events': 'none',
      })
      .on('load', () => {
        newImage.setData('image-size', {
          width: newImage.width,
          height: newImage.height,
        });

        newImage.setStyle({
          opacity: '100%',
          'pointer-events': '',
          height: originalHeight,
          width: originalWidth,
        });

        const newImg = new Image();
        newImg.onload = () =>
          newImage.setData('image-size', {
            width: newImg.width,
            height: newImg.height,
          });

        newImg.src = newImage.attr('src');
      })
      .on('click', (e) => {
        e.preventDefault();
        const imgSize = newImage.data('image-size');
        const imgData = { src: newImage.attr('src') };
        const imgAlt = newImage.add('alt');
        if (imgSize) {
          imgData.h = imgSize?.height;
          imgData.w = imgSize?.width;
        }

        if (typeof imgAlt === 'string' && imgAlt.length > 0) imgData.alt = imgAlt;
        const pswp = new PhotoSwipeLightbox({
          dataSource: [imgData],
          close: true,
          zoom: true,
          fullscreen: true,
          counter: false,
          arrowPrev: false,
          arrowNext: false,
          share: false,
          padding: { top: 40, bottom: 40, left: 100, right: 100 },
        });

        pswp.on('close', () =>
          setTimeout(() => {
            pswp.destroy();
          }, 5000),
        );

        pswp.init();
        newImage
          .fadeTo(0.7, 'fast')
          .forEach(
            (anim) => anim && anim.addEventListener('finish', () => newImage.fadeTo(1, 'fast')),
          );
      })
      .hover(
        () => newImage.fadeTo(0.8, 'fast'),
        () => newImage.fadeTo(1, 'fast'),
      );

    // Load Image
    newImage.setAttr('src', src ?? null);

    const newTinyPlace = TinyHtml.createFrom('p', { class: 'pswp-space mt-4' });
    newTinyPlace.insertAfter(newImage);
  }
};

/**
 * Create spoiler items
 *
 * @param {TinyHtml<any>} item
 */
export const fixSpoilers = (item) => {
  const chapter = item.attrNumber('data-chapter');
  const line = item.attrNumber('data-line');
  const storageLine = tinyLs.getNumber(`bookmark${chapter}`);

  item.setAttr(
    'title',
    `You need to read the line ${line} in the chapter ${chapter} for this information to be revealed automatically.`,
  );
  const tooltip = Tooltip(item);

  item.on('click', () => {
    tooltip.hide();
    tooltip.disable();
    item.replaceWith(...item.children());
  });

  if (storageLine >= line || tinyLs.getBool(`bookmarkCanSpoiler${chapter}`)) item.trigger('click');
};
