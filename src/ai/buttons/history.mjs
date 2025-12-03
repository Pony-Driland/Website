import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import { isJsonObject } from 'tiny-essentials/basics';

import { tinyIo } from '../software/base.mjs';
import { isOnline } from '../software/enablerContent.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import { loaderScreen } from '../../important.mjs';
import moment from 'moment/moment';
import { makeMsgRenderer } from '../msgRender.mjs';

export const openHistory = () => {
  if (!isOnline()) return;
  const room = tinyIo.client.getRoom();

  const $root = TinyHtml.createFrom('div');

  // Form Card
  const card = TinyHtml.createFrom('div', { class: 'card border' });
  const cardBody = TinyHtml.createFrom('div', { class: 'card-body' });

  // Form
  const form = TinyHtml.createFrom('form', { id: 'searchForm', class: 'row g-3' }).on(
    'submit',
    (e) => {
      e.preventDefault();

      const result = {
        text: textInput.valTxt(),
        userId: userInput.valTxt(),
        chapter: null,
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

      numberValidator('chapter', chapterInput);
      numberValidator('perPage', perPageInput);
      numberValidator('page', pageInput);

      if (result.userId.length < 1) result.userId = null;
      if (result.text.length < 1) result.text = null;
      loaderScreen.start();

      // Receive results
      tinyIo.client
        .loadMessages({
          page: result.page,
          perPage: result.perPage,
          text: result.text,
          chapter: result.chapter,
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
          if (!data.messages.length) {
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
            class: 'table table-bordered table-striped table-sm align-middle',
          });

          // Thead
          const thead = TinyHtml.createFrom('thead');
          const theadRow = TinyHtml.createFrom('tr');

          ['Message', 'Settings'].forEach((label) => {
            theadRow.append(TinyHtml.createFrom('th').setText(label));
          });

          thead.append(theadRow);

          // Tbody
          const tbody = TinyHtml.createFrom('tbody');

          const promises = [];
          data.messages.forEach((item) => {
            const row = TinyHtml.createFrom('tr');
            promises.push(
              new Promise(async (resolve, reject) => {
                try {
                  const date = moment(item.date);
                  const edited = moment(item.edited);
                  // Container
                  const buttonId = `history_collapse_${item.historyId}`;

                  // Button that toggles collapse
                  const btn = TinyHtml.createFrom('button', {
                    class: 'btn btn-sm btn-link p-0 me-2',
                    type: 'button',
                    'data-bs-toggle': 'collapse',
                    'data-bs-target': `#${buttonId}`,
                    'aria-expanded': 'false',
                    'aria-controls': buttonId,
                  }).setText('More Info');

                  // Collapse box
                  const collapse = TinyHtml.createFrom('div', {
                    class: 'collapse',
                    id: buttonId,
                  });

                  collapse.append(
                    TinyHtml.createFrom('div', { class: 'small' })
                      .setText(`Id: `)
                      .append(
                        TinyHtml.createFrom('span', { class: 'text-muted' }).setText(
                          item.historyId,
                        ),
                      ),
                    TinyHtml.createFrom('div', { class: 'small' })
                      .setText(`Tokens: `)
                      .append(
                        TinyHtml.createFrom('span', { class: 'text-muted' }).setText(
                          item.tokens > 0 ? item.tokens : '0',
                        ),
                      ),
                    TinyHtml.createFrom('div', { class: 'small' })
                      .setText(`Edited at: `)
                      .append(
                        TinyHtml.createFrom('span', { class: 'text-muted' }).setText(
                          edited.isValid() && edited.valueOf() > 0
                            ? `${edited.calendar()} (${edited.valueOf()})`
                            : 'never',
                        ),
                      ),
                  );

                  const colMessage = TinyHtml.createFrom('td');
                  const msgFormat = await makeMsgRenderer(item.text ?? '');
                  colMessage.append(
                    TinyHtml.createFromHtml(msgFormat),
                    TinyHtml.createFrom('div').append(
                      btn,
                      TinyHtml.createFrom('small', { class: 'text-muted me-2' }).setText(
                        date.isValid() ? date.calendar() : '',
                      ),
                      TinyHtml.createFrom('small', { class: 'text-muted me-2' }).setText(
                        !item.isModel ? (item.userId ?? '') : 'Model',
                      ),
                      TinyHtml.createFrom('small', { class: 'text-muted me-2' }).setText(
                        `Chapter ${item.chapter}` ?? '',
                      ),
                      collapse,
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
          table.append(thead, tbody);
          tableWrapper.append(table);

          resultsBox.append(tableWrapper);
          pagesCount
            .empty()
            .setText(
              `Pages: ${data.totalPages} | Page: ${result.page ?? data.page} | Items: ${data.totalItems}`,
            );

          // Success
          loaderScreen.stop();
          console.log(data);
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
      console.log(result);
    },
  );

  // --- Text Search ---
  const textGroup = TinyHtml.createFrom('div', { class: 'col-md-6' });
  const textLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText('Text Contains');
  const textInput = TinyHtml.createFrom('input', {
    type: 'text',
    class: 'form-control',
    id: 'searchText',
    placeholder: 'Search text...',
  });
  textGroup.append(textLabel, textInput);

  // --- User Filter ---
  const userGroup = TinyHtml.createFrom('div', { class: 'col-md-6' });
  const userLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText(
    'Sent By (User ID)',
  );
  const userInput = TinyHtml.createFrom('input', {
    type: 'text',
    class: 'form-control',
    id: 'searchUser',
    placeholder: 'User ID',
  });
  userGroup.append(userLabel, userInput);

  // --- Date Range ---
  const dateStartGroup = TinyHtml.createFrom('div', { class: 'col-md-6' });
  const dateStartLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText(
    'Start Date',
  );
  const dateStartInput = TinyHtml.createFrom('input', {
    type: 'datetime-local',
    class: 'form-control',
    id: 'searchStart',
  });
  dateStartGroup.append(dateStartLabel, dateStartInput);

  const dateEndGroup = TinyHtml.createFrom('div', { class: 'col-md-6' });
  const dateEndLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText('End Date');
  const dateEndInput = TinyHtml.createFrom('input', {
    type: 'datetime-local',
    class: 'form-control',
    id: 'searchEnd',
  });
  dateEndGroup.append(dateEndLabel, dateEndInput);

  // --- Chapter Filter ---
  const chapterGroup = TinyHtml.createFrom('div', { class: 'col-md-4' });
  const chapterLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText('Chapter');
  const chapterInput = TinyHtml.createFrom('input', {
    type: 'number',
    class: 'form-control',
    id: 'searchChapter',
    placeholder: 'Number',
  });
  chapterGroup.append(chapterLabel, chapterInput);
  chapterInput.setVal(room.chapter);

  // --- Pagination ---
  const perPageGroup = TinyHtml.createFrom('div', { class: 'col-md-4' });
  const perPageLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText(
    'Results Per Page',
  );
  const perPageInput = TinyHtml.createFrom('input', {
    type: 'number',
    class: 'form-control',
    id: 'searchPerPage',
    min: '1',
  }).setVal(tinyIo.client.getRateLimit().size.history);
  perPageGroup.append(perPageLabel, perPageInput);

  // --- Page Number ---
  const pageGroup = TinyHtml.createFrom('div', { class: 'col-md-4' });
  const pageLabel = TinyHtml.createFrom('label', { class: 'form-label' }).setText('Page');
  const pageInput = TinyHtml.createFrom('input', {
    type: 'number',
    class: 'form-control',
    id: 'searchPage',
    min: '1',
  }).setVal(1);
  pageGroup.append(pageLabel, pageInput);

  // --- Submit Button ---
  const btnGroup = TinyHtml.createFrom('div', { class: 'col-12 text-center mt-3' });
  const submitBtn = TinyHtml.createFrom('button', {
    type: 'submit',
    class: 'btn btn-primary px-4 py-2',
  }).setText('Search');

  btnGroup.append(submitBtn);

  // Assemble Form
  form.append(
    textGroup,
    userGroup,
    dateStartGroup,
    dateEndGroup,
    chapterGroup,
    perPageGroup,
    pageGroup,
    btnGroup,
  );

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
    title: 'Conversation History Search',
    dialog: 'modal-lg',
    id: 'chat-history-search',
    body: $root,
  });
};
