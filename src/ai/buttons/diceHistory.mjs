import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';

import { tinyIo } from '../software/base.mjs';
import { isOnline } from '../software/enablerContent.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import { loaderScreen } from '../../important.mjs';
import moment from 'moment/moment';
import { createDiceSpecialHtml } from './dice.mjs';

const { Form, Button, TextInput, DateTimeInput, NumberInput, Textarea } = TinyHtmlElems;

export const openDiceHistory = () => {
  if (!isOnline()) return;
  const room = tinyIo.client.getRoom();

  const $root = TinyHtml.createFrom('div');

  // Form Card
  const card = TinyHtml.createFrom('div', { class: 'card border' });
  const cardBody = TinyHtml.createFrom('div', { class: 'card-body' });

  // Form
  const form = new Form({ id: 'searchForm', mainClass: 'row', tags: 'g-3' }).on('submit', (e) => {
    e.preventDefault();

    const result = {
      userId: userInput.valTxt(),
      perPage: null,
      page: null,
      start: null,
      end: null,
    };

    /**
     * @param {string} name
     * @param {import('tiny-essentials/libs/TinyHtml').TinyHtmlAny} input
     */
    const dateValidator = (name, input) => {
      try {
        result[name] = input.valDate()?.valueOf() ?? null;
      } catch {
        result[name] = null;
      }
    };

    /**
     * @param {string} name
     * @param {import('tiny-essentials/libs/TinyHtml').TinyHtmlAny} input
     */
    const numberValidator = (name, input) => {
      try {
        result[name] = input.valNb();
      } catch {
        result[name] = null;
      }
    };

    dateValidator('start', dateStartInput);
    dateValidator('end', dateEndInput);

    numberValidator('perPage', perPageInput);
    numberValidator('page', pageInput);

    if (result.userId.length < 1) result.userId = null;
    loaderScreen.start();

    // Receive results
    tinyIo.client
      .loadDiceHistory({
        page: result.page,
        perPage: result.perPage,
        userId: result.userId,
        start: result.start,
        end: result.end,
      })
      .then(async (data) => {
        resultsBox.empty();
        // Error
        if (data.error) {
          resultsBox.append(
            TinyHtml.createFrom('div', { class: 'text-danger' }).setText(result.msg),
            TinyHtml.createFrom('div', { class: 'small' }).setText(result.code),
          );
          pagesCount.empty();
          loaderScreen.stop();
          return;
        }

        // No results
        if (!data.history.length) {
          resultsBox.append(
            TinyHtml.createFrom('p', { class: 'text-muted m-0' }).setText('No results found.'),
          );
          pagesCount.empty();
          loaderScreen.stop();
          return;
        }

        // Table wrapper
        const tableWrapper = TinyHtml.createFrom('div', { class: 'table-responsive' });

        // Table
        const table = TinyHtml.createFrom('table', {
          class: 'table table-hover table-bordered table-striped table-sm align-middle',
        });

        // Tbody
        const tbody = TinyHtml.createFrom('tbody');

        const promises = [];
        data.history.reverse().forEach((item) => {
          const row = TinyHtml.createFrom('tr');
          promises.push(
            new Promise(async (resolve, reject) => {
              try {
                const date = moment(item.date);
                const msgBase = TinyHtml.createFrom('span', {
                  class: 'msg-data',
                  id: `dice-roll-${item.id}`,
                });
                const colMessage = TinyHtml.createFrom('td', { class: 'p-3' });
                /**const openDice = new Button({
                    mainClass: 'btn',
                    tags: 'w-100 btn-md btn-outline-info',
                    type: 'button',
                    label: `Show Data`,
                  }).on('click', () => openDice.replaceWith(createDiceSpecialHtml(item)));
                  
                msgBase.append(openDice); */
                msgBase.append(createDiceSpecialHtml(item));

                colMessage.append(
                  msgBase,
                  TinyHtml.createFrom('hr', { class: 'msg-hr m-0 mt-2' }),
                  TinyHtml.createFrom('div').append(
                    TinyHtml.createFrom('small', { class: 'text-muted me-2' }).setText(
                      date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : '',
                    ),
                    TinyHtml.createFrom('small', {
                      class: `${item.userId !== tinyIo.client.getUserId() ? `text-muted` : 'text-primary'} me-2`,
                    }).setText(item.userId),
                    TinyHtml.createFrom('div', { class: 'small' })
                      .setText(`Id: `)
                      .append(
                        TinyHtml.createFrom('span', { class: 'text-muted' }).setText(item.id),
                      ),
                  ),
                );

                row.append(colMessage);
                resolve(undefined);
              } catch (err) {
                reject(err);
              }
            }),
          );
          tbody.append(row);
        });

        // Assemble
        await Promise.all(promises);
        table.append(tbody);
        tableWrapper.append(table);

        resultsBox.append(tableWrapper);
        pagesCount
          .empty()
          .setText(
            `Pages: ${data.totalPages} | Page: ${result.page ?? data.page} | Items: ${data.totalItems}`,
          );

        // Success
        loaderScreen.stop();
      })
      // Error
      .catch((err) => {
        resultsBox
          .empty()
          .append(TinyHtml.createFrom('div', { class: 'text-danger' }).setText(err.message));
        pagesCount.empty();
        console.error(err);
        loaderScreen.stop();
      });
  });

  // --- User Filter ---
  const userGroup = TinyHtml.createFrom('div', { class: 'col-md-12' });
  const userLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText(
    'Sent By (User ID)',
  );
  const userInput = new TextInput({
    mainClass: 'form-control',
    id: 'searchUser',
    placeholder: 'User ID',
  });
  userGroup.append(userLabel, userInput);

  // --- Date Range ---
  const dateStartGroup = TinyHtml.createFrom('div', { class: 'col-md-6' });
  const dateStartLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText(
    'Start Date',
  );
  const dateStartInput = new DateTimeInput({
    mainClass: 'form-control',
    id: 'searchStart',
  });
  dateStartGroup.append(dateStartLabel, dateStartInput);

  const dateEndGroup = TinyHtml.createFrom('div', { class: 'col-md-6' });
  const dateEndLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText('End Date');
  const dateEndInput = new DateTimeInput({
    mainClass: 'form-control',
    id: 'searchEnd',
  });
  dateEndGroup.append(dateEndLabel, dateEndInput);

  // --- Pagination ---
  const perPageGroup = TinyHtml.createFrom('div', { class: 'col-md-6' });
  const perPageLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText(
    'Results Per Page',
  );
  const perPageInput = new NumberInput({
    mainClass: 'form-control',
    id: 'searchPerPage',
    min: 1,
  }).setVal(tinyIo.client.getRateLimit().size.history);
  perPageGroup.append(perPageLabel, perPageInput);

  // --- Page Number ---
  const pageGroup = TinyHtml.createFrom('div', { class: 'col-md-6' });
  const pageLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText('Page');
  const pageInput = new NumberInput({
    mainClass: 'form-control',
    id: 'searchPage',
    min: 1,
  }).setVal(1);
  pageGroup.append(pageLabel, pageInput);

  // --- Submit Button ---
  const btnGroup = TinyHtml.createFrom('div', { class: 'col-12 text-center mt-3' });
  const submitBtn = new Button({
    type: 'submit',
    mainClass: 'btn',
    tags: 'btn-primary px-4 py-2',
    label: 'Search',
  });

  btnGroup.append(submitBtn);

  // Assemble Form
  form.append(userGroup, dateStartGroup, dateEndGroup, perPageGroup, pageGroup, btnGroup);

  // Results Container
  const pagesCount = TinyHtml.createFrom('div', { class: 'small fw-bold text-center' });
  const resultsTitle = TinyHtml.createFrom('h4', { class: 'mt-5 fw-bold text-center' }).setText(
    'Results',
  );
  const resultsBox = TinyHtml.createFrom('div', {
    id: 'results',
    class: 'mt-3 p-3 border rounded',
  }).setText('No results yet.');

  // Nesting structure
  cardBody.append(form);
  card.append(cardBody);
  $root.append(card, resultsTitle, pagesCount, resultsBox);

  // Start modal
  tinyLib.modal({
    title: 'Dice History Search',
    dialog: 'modal-lg',
    id: 'chat-history-search',
    body: $root,
  });
};
