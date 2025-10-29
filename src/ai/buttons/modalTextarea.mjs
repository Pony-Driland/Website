import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyTextRangeEditor from 'tiny-essentials/libs/TinyTextRangeEditor';

import tinyLib from '../../files/tinyLib.mjs';
import ficConfigs from '../values/ficConfigs.mjs';
import { canSandBox, tinyAi } from '../software/base.mjs';

// Textarea Template
export const tinyModalTextarea = (
  config = {
    info: '???',
    size: 200,
    submitName: 'Submit',
    addTemplates: null,
    submitCall: null,
    id: null,
    textarea: null,
    readOnly: false,
  },
  textValueName = 'text',
) => {
  // Body
  const body = TinyHtml.createFrom('div');

  const textarea = TinyHtml.createFrom('textarea', {
    class: 'form-control',
    style: `height: ${String(config.size)}px;`,
  });
  textarea.setVal(config.textarea);
  if (config.readOnly) textarea.addProp('readOnly');

  const textEditor = new TinyTextRangeEditor(textarea.get(0));

  // Templates list
  if (
    !config.readOnly &&
    config.addTemplates &&
    Array.isArray(config.addTemplates.data) &&
    config.addTemplates.data.length > 0
  ) {
    const templateList = config.addTemplates.data;
    // Select
    const textareaAdd = TinyHtml.createFrom('select', { class: 'form-control' });
    textareaAdd.append(
      TinyHtml.createFrom('option', { value: 'DEFAULT' }).setText(config.addTemplates.title),
    );

    // Separator
    const addSeparator = () =>
      textareaAdd.append(
        TinyHtml.createFrom('option').addProp('disabled').setText('----------------------'),
      );

    addSeparator();

    // Add options
    for (const index in templateList) {
      const templateItem = templateList[index];
      // Validator
      const valueTypeValidator = () => {
        // Tiny code
        const tinyTypeValidator = (tinyTxtValName) =>
          typeof templateItem[tinyTxtValName] === 'string' || templateItem.type === tinyTxtValName;

        // String
        if (typeof textValueName === 'string') return tinyTypeValidator(textValueName);

        // Array
        if (Array.isArray(textValueName)) {
          for (const index in textValueName) {
            if (tinyTypeValidator(textValueName[index])) return true;
          }
        }

        // Nothing
        return false;
      };

      // Get data
      const getTypeValue = () => {
        // Tiny code
        const tinyTypeValidator = (tinyTxtValName) =>
          typeof templateItem[tinyTxtValName] === 'string' ? templateItem[tinyTxtValName] : null;

        // String
        if (typeof textValueName === 'string') {
          const value = tinyTypeValidator(textValueName);
          if (value) return value;
        }

        // Array
        if (Array.isArray(textValueName)) {
          for (const index in textValueName) {
            const value = tinyTypeValidator(textValueName[index]);
            if (value) return value;
          }
        }

        // Nothing
        return null;
      };

      const ficOptionData = ficConfigs.data.find((item) => item.id === ficConfigs.selected);

      if (
        ficOptionData &&
        // Sandbox
        (typeof templateItem.sandboxOnly !== 'boolean' ||
          !templateItem.sandboxOnly ||
          canSandBox(ficConfigs.selected)) &&
        // Safe mode
        (typeof ficOptionData.isSafe !== 'boolean' ||
          !ficOptionData.isSafe ||
          (ficOptionData.isSafe && !templateItem.isNotSafe))
      ) {
        // Normal way
        if (!templateItem.hr) {
          // Validator
          if (
            valueTypeValidator() &&
            (typeof templateItem.value === 'string' || templateItem.disabled)
          )
            textareaAdd.append(
              TinyHtml.createFrom('option', {
                value: templateItem.value,
              })
                // Data item
                .setData('TinyAI-select-text', getTypeValue())
                .setData(
                  'TinyAI-temperature',
                  typeof templateItem.temperature === 'number' &&
                    !Number.isNaN(templateItem.temperature) &&
                    templateItem.temperature >= 0
                    ? templateItem.temperature
                    : null,
                )
                .setData(
                  'TinyAI-max-output-tokens',
                  typeof templateItem.maxOutputTokens === 'number' &&
                    !Number.isNaN(templateItem.maxOutputTokens) &&
                    templateItem.maxOutputTokens >= 0
                    ? templateItem.maxOutputTokens
                    : null,
                )
                .setData(
                  'TinyAI-topP',
                  typeof templateItem.topP === 'number' &&
                    !Number.isNaN(templateItem.topP) &&
                    templateItem.topP >= 0
                    ? templateItem.topP
                    : null,
                )
                .setData(
                  'TinyAI-topK',
                  typeof templateItem.topK === 'number' &&
                    !Number.isNaN(templateItem.topK) &&
                    templateItem.topK >= 0
                    ? templateItem.topK
                    : null,
                )
                .setData(
                  'TinyAI-presence-penalty',
                  typeof templateItem.presencePenalty === 'number' &&
                    !Number.isNaN(templateItem.presencePenalty) &&
                    templateItem.presencePenalty >= 0
                    ? templateItem.presencePenalty
                    : null,
                )
                .setData(
                  'TinyAI-frequency-penalty',
                  typeof templateItem.frequencyPenalty === 'number' &&
                    !Number.isNaN(templateItem.frequencyPenalty) &&
                    templateItem.frequencyPenalty >= 0
                    ? templateItem.frequencyPenalty
                    : null,
                )
                // Option name
                .setText(templateItem.name)

                // Option is disabled?
                .toggleProp(
                  'disabled',
                  typeof templateItem.disabled === 'boolean' ? templateItem.disabled : false,
                ),
            );
        }
        // Separator
        else if (valueTypeValidator()) addSeparator();
      }
    }

    // Option selected
    textareaAdd.on('change', () => {
      // Get value
      const option = new TinyHtml(textareaAdd.find(`[value="${textareaAdd.val()}"]`));
      const text = option ? option.data('TinyAI-select-text') : null || null;

      const tempValue = option.data('TinyAI-temperature') || null;
      const maxOutputTokensValue = option.data('TinyAI-max-output-tokens') || null;

      const topPValue = option.data('TinyAI-topP') || null;
      const topKValue = option.data('TinyAI-topK') || null;
      const presencePenaltyValue = option.data('TinyAI-presence-penalty') || null;
      const frequencyPenaltyValue = option.data('TinyAI-frequency-penalty') || null;

      if (typeof tempValue === 'number') tinyAi.setTemperature(tempValue);
      if (typeof maxOutputTokensValue === 'number') tinyAi.setMaxOutputTokens(maxOutputTokensValue);
      if (typeof topPValue === 'number') tinyAi.setTopP(topPValue);
      if (typeof topKValue === 'number') tinyAi.setTopK(topKValue);
      if (typeof presencePenaltyValue === 'number') tinyAi.setPresencePenalty(presencePenaltyValue);
      if (typeof frequencyPenaltyValue === 'number')
        tinyAi.setFrequencyPenalty(frequencyPenaltyValue);

      textareaAdd.setVal('DEFAULT');

      // Insert text
      if (typeof text === 'string' && text.length > 0)
        textEditor.insertText(text, { autoSpacing: true }).focus();
    });

    // Insert into body
    body.append(textareaAdd);
  }

  // Add textarea
  body.append(TinyHtml.createFrom('p').setText(config.info));
  body.append(textarea);

  // Submit
  if (!config.readOnly) {
    const submit = tinyLib.bs.button('info m-2 ms-0');
    submit.setText(config.submitName);

    submit.on('click', () => {
      config.submitCall(textarea.val());
      TinyHtml.query(`#${config.id}`)?.data('BootstrapModal').hide();
    });

    body.append(TinyHtml.createFrom('div', { class: 'd-grid gap-2 col-6 mx-auto' }).append(submit));
  }

  // Start modal
  tinyLib.modal({
    id: config.id,
    title: 'AI Prompt',
    dialog: 'modal-lg',
    body,
  });
};
