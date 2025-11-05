import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import { isJsonObject } from 'tiny-essentials/basics';
import TinyDices from 'tiny-dices';
import { saveAs } from 'file-saver';

import { tinyIo } from '../software/base.mjs';
import { isOnline } from '../software/enablerContent.mjs';
import { tinyLs } from '../../important.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import { applyDiceModifiers, parseDiceString } from './diceUtils.mjs';
import { Tooltip } from '../../modules/TinyBootstrap.mjs';

/**
 * @param {import('tiny-essentials/libs/TinyHtml').TinyHtmlAny} $totalBase
 * @param {import('./diceUtils.mjs').ApplyDiceModifiersResult} data
 * @returns {NodeJS.Timeout}
 */
export const createDiceResults = ($totalBase, data, callback = () => undefined) => {
  /**
   * Insert Total Value (Bootstrap 5 styled display)
   */
  const insertTotal = () => {
    const { final, steps } = data;
    $totalBase.empty();

    // Create main container
    const container = TinyHtml.createFrom('div');
    container.addClass('card', 'shadow-sm', 'mt-3');

    // Card body
    const body = TinyHtml.createFrom('div');
    body.addClass('card-body');
    container.append(body);

    // Total display
    $totalBase.append(final);

    const tableWrapper = TinyHtml.createFrom('div');
    tableWrapper.addClass('table-responsive');
    body.append(tableWrapper);

    // Table for steps
    const table = TinyHtml.createFrom('table');
    table.addClass('table', 'table-striped', 'table-bordered', 'align-middle', 'm-0');
    tableWrapper.append(table);
    body.append(tableWrapper);

    const thead = TinyHtml.createFrom('thead');
    thead.setHtml(`
    <tr class="text-center">
      <th scope="col">Expression Tokens</th>
      <th scope="col">Result</th>
    </tr>
  `);
    table.append(thead);

    const tbody = TinyHtml.createFrom('tbody');
    table.append(tbody);

    // Read steps
    steps.forEach((step) => {
      const tr = TinyHtml.createFrom('tr');
      tr.addClass('text-center');

      // Tokens Base
      const tdTokens = TinyHtml.createFrom('td');
      tdTokens.addClass('text-center dice-exp');

      /** @type {TinyHtml<HTMLElement>} */
      const result = [];
      /** @type {TinyHtml<HTMLElement>} */
      const rawResult = [];
      let rawMode = true;

      // Tokens
      step.tokens.forEach((t, index) => {
        const item = TinyHtml.createFrom('span', {
          class: `badge bg-${step.diceTokenSlots.indexOf(index) < 0 ? 'secondary' : 'primary'} mx-1`,
        }).setText(t);
        result.push(item);
      });

      // Raw Tokens
      step.rawTokens.forEach((t, index) => {
        const item = TinyHtml.createFrom('span', {
          class: `badge bg-${step.rawDiceTokenSlots.indexOf(index) < 0 ? 'secondary' : 'primary'} mx-1`,
        })
          .setText(t)
          .setAttr('title', step.rawTokensP[index]);
        new Tooltip(item);
        rawResult.push(item);
      });

      tdTokens.append(...rawResult);

      // Token change viewer
      tdTokens.on('click', () => {
        tdTokens.empty();
        if (rawMode) {
          rawMode = false;
          rawResult.forEach((item) => item.data('BootstrapToolTip')?.hide());
          tdTokens.append(...result);
        } else {
          rawMode = true;
          result.forEach((item) => item.data('BootstrapToolTip')?.hide());
          tdTokens.append(...rawResult);
        }
      });

      // Total
      const tdResult = TinyHtml.createFrom('td');
      tdResult.setHtml(`<span class="fw-bold">${step.total}</span>`);

      // Add tds
      tr.append(tdTokens);
      tr.append(tdResult);
      tbody.append(tr);
    });

    // Insert into page
    $totalBase.append(container);
  };

  return setTimeout(() => {
    insertTotal();
    callback();
  }, 2000);
};

/**
 * Generate a random ID.
 * @param {number} [length=8] - Length of the generated ID.
 * @returns {string} Randomly generated ID.
 */
function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * @param {Object} data
 * @param {number} data.total
 * @param {string} data.userId
 * @param {{ sides: number; roll: number; tokens: string[]; total: number; canZero: boolean; }[]} data.results
 * @param {{ bg: string; border: string; img: string; selectionBg: string; selectionText: string; text: string; }} data.skin
 */
export const openDiceSpecialModal = (data) => {
  const $root = TinyHtml.createFrom('div');
  const $diceContainer = TinyHtml.createFrom('div');
  const dice = new TinyDices($diceContainer.get(0));

  if (isJsonObject(data.skin)) {
    if (data.skin.img) dice.bgImg = data.skin.img;
    if (data.skin.bg) dice.bgSkin = data.skin.bg;
    if (data.skin.selectionBg) dice.selectionBgSkin = data.skin.selectionBg;
    if (data.skin.selectionText) dice.selectionTextSkin = data.skin.selectionText;
    if (data.skin.border) dice.borderSkin = data.skin.border;
    if (data.skin.text) dice.textSkin = data.skin.text;
  }

  const $totalBase = TinyHtml.createFrom('center', { class: 'fw-bold mt-3' }).setText(0);

  for (const item of data.results) {
    dice.insertDiceElement(item.value, item.sides, data.canZero);
  }

  const user = tinyIo.client.getUsers()[data.userId] ?? null;

  $root.append(
    TinyHtml.createFrom('center', { class: 'fw-bold h3 mb-2' }).setText(
      user?.nickname ?? data.userId,
    ),
    $diceContainer,
    $totalBase,
  );

  createDiceResults($totalBase, applyDiceModifiers(data.results, data.modifiers));

  // Start modal
  tinyLib.modal({
    title: 'Dice Roll Result',
    dialog: 'modal-lg',
    id: `dice-roll-${generateRandomId()}`,
    body: $root,
  });
};

export const openTinyDices = () => {
  // Root
  const $root = TinyHtml.createFrom('div');
  const $formRow = TinyHtml.createFrom('div').addClass('row g-3');
  const $totalBase = TinyHtml.createFrom('center', { class: 'fw-bold mt-3' }).setText(0);

  // Config
  const tinyCfg = {
    isOnline: isOnline(),
    data: {},
    rateLimit: {},
  };

  if (tinyCfg.isOnline) {
    tinyCfg.data = tinyIo.client.getDice() || {};
    const ratelimit = tinyIo.client.getRateLimit() || { dice: {}, size: {} };
    if (isJsonObject(ratelimit.dice)) tinyCfg.rateLimit = ratelimit.dice;
  } else {
    tinyCfg.data.img = tinyLs.getItem(`tiny-dice-img`) || undefined;
    tinyCfg.data.bg = tinyLs.getItem(`tiny-dice-bg`) || 'white';
    tinyCfg.data.text = tinyLs.getItem(`tiny-dice-text`) || 'black';
    tinyCfg.data.border = tinyLs.getItem(`tiny-dice-border`) || '2px solid rgba(0, 0, 0, 0.05)';
    tinyCfg.data.selectionBg = tinyLs.getItem(`tiny-dice-selection-bg`) || 'black';
    tinyCfg.data.selectionText = tinyLs.getItem(`tiny-dice-selection-text`) || 'white';
  }

  // Form template
  const configs = {};
  const genLabel = (id, text) =>
    TinyHtml.createFrom('label')
      .addClass('form-label')
      .setAttr('for', `tiny-dice_${id}`)
      .setText(text);

  const genInput = (id, type, value, min) =>
    TinyHtml.createFrom('input')
      .addClass('form-control text-center')
      .setAttr({ id: `tiny-dice_${id}`, type, min })
      .setAttr('placeholder', min)
      .setVal(value);

  const genConfig = (id, text, type, value, min) => {
    configs[id] = genInput(id, type, value, min);
    return [genLabel(id, text), configs[id]];
  };

  // Form
  const $perDieCol = TinyHtml.createFrom('div')
    .addClass('col-md-12')
    .append(
      genConfig('perDieValues', 'Per-Die Values', 'text', 'd6', 'e.g.: 6, (0 | 1 | d6) + d6 + 1'),
    );

  const $allow0input = TinyHtml.createFrom('input')
    .addClass('form-check-input')
    .setAttr({ type: 'checkbox', id: 'tiny-dice_allow0' });
  const $allow0Col = TinyHtml.createFrom('div')
    .addClass('d-flex justify-content-center align-items-center mt-2')
    .append(
      TinyHtml.createFrom('div')
        .addClass('form-check')
        .append(
          $allow0input,
          TinyHtml.createFrom('label')
            .addClass('form-check-label')
            .setAttr('for', 'tiny-dice_allow0')
            .setText('Allow zero values'),
        ),
    );

  $formRow.append($perDieCol);

  // Roll button
  const $rollButton = tinyLib.bs.button('primary w-100 mb-4 mt-2').setText('Roll Dice');

  // Add container
  const $diceContainer = TinyHtml.createFrom('div');
  const $diceError = TinyHtml.createFrom('div');
  /** @type {Array<[string, string]>} */
  const readSkinValues = [
    ['bgSkin', 'bg'],
    ['textSkin', 'text'],
    ['borderSkin', 'border'],
    ['bgImg', 'img'],
    ['selectionBgSkin', 'selectionBg'],
    ['selectionTextSkin', 'selectionText'],
  ];

  // TinyDices logic
  const dice = new TinyDices($diceContainer.get(0));
  let updateTotalBase = null;
  $rollButton.on('click', async () => {
    // Get values
    const perDieRaw = configs.perDieValues.val().trim();
    const parsedPerDie = parseDiceString(perDieRaw);

    // Get sides amount
    const sidesAmount = [];
    parsedPerDie.sides.forEach((item) => {
      for (let i = 0; i < item.count; i++) sidesAmount.push(item.sides);
    });
    const perDieRaw2 = sidesAmount.join(', ');
    const perDie = perDieRaw2.length > 0 ? perDieRaw2 : null;

    // Can Zero
    const canZero = $allow0input.is(':checked');

    // Prepare total base and reset timeout
    $totalBase.setText(0);
    if (updateTotalBase) {
      clearTimeout(updateTotalBase);
      updateTotalBase = null;
    }

    // Offline
    if (!tinyCfg.isOnline) {
      const result = dice.roll(perDie, canZero);
      /** @type {number[]} */
      const diceResults = [];
      for (const item of result) diceResults.push(item.result);
      updateTotalBase = createDiceResults(
        $totalBase,
        applyDiceModifiers(diceResults, parsedPerDie.modifiers),
        () => (updateTotalBase = null),
      );
    }
    // Online
    else {
      // Prepare data
      const diceParse = dice.parseRollConfig(perDie);
      const sides = [];
      for (const index in diceParse) sides.push(diceParse[index]);

      // Get result
      $rollButton.addProp('disabled').addClass('disabled');
      const result = await tinyIo.client.rollDice(sides, canZero, parsedPerDie.modifiers);
      $rollButton.removeProp('disabled').removeClass('disabled');

      // Proccess Results
      if (!result.error) {
        dice.clearDiceArea();
        $totalBase.removeClass('text-danger');
        if (
          Array.isArray(result.results) &&
          result.results.every(
            (item) => typeof item.value === 'number' && typeof item.sides === 'number',
          )
        ) {
          for (const index in result.results) {
            dice.insertDiceElement(
              result.results[index].value,
              result.results[index].sides,
              canZero,
            );
          }

          updateTotalBase = createDiceResults(
            $totalBase,
            applyDiceModifiers(result.results, parsedPerDie.modifiers),
            () => (updateTotalBase = null),
          );
        }
      } else $totalBase.addClass('text-danger').setText(result.msg);
    }
  });

  // Skin form
  const createInputField = (label, id, placeholder, value) => {
    configs[id] = TinyHtml.createFrom('input')
      .addClass('form-control text-center')
      .setAttr({ type: 'text', placeholder })
      .setVal(value);

    return TinyHtml.createFrom('div')
      .addClass('col-md-4 text-center')
      .append(
        TinyHtml.createFrom('label').addClass('form-label').setAttr('for', id).setText(label),
        configs[id],
      );
  };

  configs.bgImg = TinyHtml.createFrom('input')
    .addClass('form-control')
    .addClass('d-none')
    .setAttr('type', 'text')
    .setVal(tinyCfg.data.img);
  const bgImgUploadButton = tinyLib.bs.button('info w-100');
  const uploadImgButton = tinyLib.upload.img(
    bgImgUploadButton.setText('Select Image').on('contextmenu', (e) => {
      e.preventDefault();
      configs.bgImg.setVal('').removeClass('text-danger').trigger('change');
    }),
    (err, dataUrl) => {
      console.log(`[dice-file] [upload] Image length: ${dataUrl.length}`);

      // Error
      bgImgUploadButton.removeClass('text-danger');
      if (err) {
        console.error(err);
        bgImgUploadButton.addClass('text-danger');
        return;
      }

      const maxSize = tinyCfg.rateLimit.img || 0;
      const base64String = dataUrl.split(',')[1];
      const padding = (base64String.match(/=+$/) || [''])[0].length;
      const sizeInBytes = (base64String.length * 3) / 4 - padding;

      const convertToMb = (tinyBytes) => `${(tinyBytes / (1024 * 1024)).toFixed(2)} MB`;
      console.log(`[dice-file] [upload] Image size: ${convertToMb(sizeInBytes)}`);
      console.log(`[dice-file] [upload] Upload limit: ${convertToMb(maxSize)}`);

      // Big Image
      $diceError.empty();
      if (maxSize > 0 && sizeInBytes > maxSize) {
        bgImgUploadButton.addClass('text-danger');
        tinyLib.alert(
          $diceError,
          'danger',
          'bi bi-exclamation-triangle-fill',
          `Image is too large: ${convertToMb(sizeInBytes)} (max allowed: ${convertToMb(maxSize)})`,
        );
        return;
      }

      // OK
      configs.bgImg.setVal(dataUrl).removeClass('text-danger').trigger('change');
    },
  );

  const importDiceButton = tinyLib.upload.json(
    tinyLib.bs.button('info w-100').setText('Import'),
    (err, jsonData) => {
      // Error
      if (err) {
        console.error(err);
        alert(err.message);
        return;
      }

      // Insert data
      if (isJsonObject(jsonData) && isJsonObject(jsonData.data)) {
        for (const index in readSkinValues) {
          const readSkinData = readSkinValues[index];
          const name = readSkinData[1];
          const item = jsonData.data[name];
          if (typeof item === 'string' || typeof item === 'number') {
            const newValue =
              typeof tinyCfg.rateLimit[name] !== 'number' || item.length <= tinyCfg.rateLimit[name]
                ? item
                : null;
            configs[readSkinData[0]].setVal(newValue).trigger('change');
          }
        }
      }
    },
  );

  const $formRow2 = TinyHtml.createFrom('div', { class: 'd-none' })
    .addClass('row g-3 mb-4')
    .append(
      // Background skin
      createInputField('Background Skin', 'bgSkin', 'e.g. red or rgb(200,0,0)', tinyCfg.data.bg),
      // Text skin
      createInputField('Text Skin', 'textSkin', 'e.g. white or #fff', tinyCfg.data.text),
      // Border skin
      createInputField(
        'Border Skin',
        'borderSkin',
        'e.g. 2px solid rgba(255, 255, 255, 0.2)',
        tinyCfg.data.border,
      ),
      // Bg skin
      createInputField(
        'Select Bg Skin',
        'selectionBgSkin',
        'e.g. black or #000',
        tinyCfg.data.selectionBg,
      ),
      // Text skin
      createInputField(
        'Select Text Skin',
        'selectionTextSkin',
        'e.g. white or #fff',
        tinyCfg.data.selectionText,
      ),
      // Image upload
      configs.bgImg,
      TinyHtml.createFrom('div', { class: 'col-md-4 text-center' }).append(
        TinyHtml.createFrom('label').addClass('form-label').setText('Custom Image'),
        uploadImgButton,
      ),
      // Export
      TinyHtml.createFrom('div', { class: 'col-md-6' }).append(
        tinyLib.bs
          .button('info w-100')
          .setText('Export')
          .on('click', () => {
            // Data base
            const fileData = { data: {} };
            for (const index in readSkinValues) {
              const readSkinData = readSkinValues[index];
              fileData.data[readSkinData[1]] = configs[readSkinData[0]].val().trim();
            }

            // Date
            fileData.date = Date.now();
            // Save
            saveAs(
              new Blob([JSON.stringify(fileData)], { type: 'text/plain' }),
              `tiny_dice_skin_ponydriland.json`,
            );
          }),
      ),
      // Import
      TinyHtml.createFrom('div', { class: 'col-md-6' }).append(importDiceButton),
    );

  const updateDiceData = (where, dataName, value) => {
    dice[where] = value;
    if (!tinyIo.client) {
      if (value) tinyLs.setItem(`tiny-dice-${dataName}`, value);
      else tinyLs.removeItem(`tiny-dice-${dataName}`);
    }
    dice.updateDicesSkin();
  };

  for (const index in readSkinValues) {
    const tinySkin = configs[readSkinValues[index][0]];
    tinySkin.on('change', () => {
      updateDiceData(
        readSkinValues[index][0],
        readSkinValues[index][1],
        tinySkin.val().trim() || null,
      );
    });
  }

  const updateAllSkins = () => {
    for (const index in readSkinValues) configs[readSkinValues[index][0]].trigger('change');
  };

  // Root insert
  $root.append(TinyHtml.createFrom('center').append($formRow), $allow0Col, $formRow2);

  // Main button of the skin editor
  const $applyBtn = tinyLib.bs.button('success w-100').setText('Edit Skin Data');
  $applyBtn.on('click', async () => {
    // Show content
    if ($formRow2.hasClass('d-none')) {
      $applyBtn.setText(tinyIo.client ? 'Apply Dice Skins' : 'Hide Skin Data');
    }
    // Hide Content
    else {
      $applyBtn.setText('Edit Skin Data');
      if (tinyCfg.isOnline) {
        updateAllSkins();

        // Disable buttons
        $applyBtn.addProp('disabled').addClass('disabled');
        const diceSkin = {};
        importDiceButton.addProp('disabled').addClass('disabled');
        uploadImgButton.addProp('disabled').addClass('disabled');

        // Send dice data
        for (const index in readSkinValues)
          diceSkin[readSkinValues[index][1]] = configs[readSkinValues[index][0]]
            .addProp('disabled')
            .addClass('disabled')
            .val()
            .trim();

        const result = await tinyIo.client.setAccountDice(diceSkin);
        if (result.error) $totalBase.addClass('text-danger').setText(result.msg);
        else {
          $totalBase.removeClass('text-danger').setText(0);
          tinyIo.client.setDice(diceSkin);
        }

        // Enable buttons again
        for (const index in readSkinValues)
          configs[readSkinValues[index][0]].removeProp('disabled').removeClass('disabled');
        uploadImgButton.removeProp('disabled').removeClass('disabled');
        importDiceButton.removeProp('disabled').removeClass('disabled');
        $applyBtn.removeProp('disabled').removeClass('disabled');
      }
    }
    // Change class mode
    $formRow2.toggleClass('d-none');
  });

  $root.append($applyBtn, $rollButton, $diceError, $diceContainer, $totalBase);
  updateAllSkins();
  dice.roll([0, 0, 0]);

  // Start modal
  tinyLib.modal({
    title: 'Dice Roll',
    dialog: 'modal-lg',
    id: 'dice-roll',
    body: $root,
  });
};
