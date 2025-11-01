import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import { isJsonObject } from 'tiny-essentials/basics';
import TinyDices from 'tiny-dices';
import { saveAs } from 'file-saver';

import { tinyIo } from '../software/base.mjs';
import { isOnline } from '../software/enablerContent.mjs';
import { tinyLs } from '../../important.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import { applyDiceModifiers, parseDiceString } from './diceUtils.mjs';

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
    .append(genConfig('perDieValues', 'Per-Die Values', 'text', '6', 'e.g., 6,12,20'));

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
    const perDieRaw2 = parsedPerDie.sides.map((value) => String(value)).join(', ');
    const perDie = perDieRaw2.length > 0 ? perDieRaw2 : null;

    const canZero = $allow0input.is(':checked');
    $totalBase.setText(0);
    if (updateTotalBase) {
      clearTimeout(updateTotalBase);
      updateTotalBase = null;
    }

    /**
     * Insert Total
     * @param {Object} config
     * @param {number} config.total
     * @param {{ result: number; total: number; total: number; tokens: string[]; }} config.results
     */
    const insertTotal = ({ total, results }) => {
      console.log(total, results);
      $totalBase.setText(total);
    };

    // Offline
    if (!tinyCfg.isOnline) {
      const result = dice.roll(perDie, canZero);
      const data = { total: 0, results: [] };
      for (const index in result) {
        const item = result[index];
        const tinyItem = {
          result: item.result,
          sides: parsedPerDie.sides[index],
          total: item.result,
          tokens: [String(item.result)],
        };
        const mod = parsedPerDie.modifiers.find((ti) => ti.index === Number(index));

        if (mod) {
          const modResult = applyDiceModifiers(item.result, [mod]);
          tinyItem.total = modResult.final;
          tinyItem.tokens = modResult.steps[0].tokens;
        }

        data.results.push(tinyItem);
        data.total += tinyItem.total;
      }

      updateTotalBase = setTimeout(() => {
        insertTotal(data);
        updateTotalBase = null;
      }, 2000);
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
        if (Array.isArray(result.results) && typeof result.total === 'number') {
          const data = { total: result.total, results: [] };

          for (const index in result.results) {
            if (
              typeof result.results[index].sides === 'number' &&
              typeof result.results[index].roll === 'number'
            ) {
              dice.insertDiceElement(
                result.results[index].roll,
                result.results[index].sides,
                canZero,
              );

              data.results.push({
                result: result.results[index].roll,
                sides: result.results[index].sides,
                total: result.results[index].total,
                tokens: result.results[index].tokens,
              });
            }
          }
          updateTotalBase = setTimeout(() => {
            insertTotal(data);
            updateTotalBase = null;
          }, 2000);
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
