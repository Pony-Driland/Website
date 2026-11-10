import EventEmitter from 'events';
import { isJsonObject } from 'tiny-essentials/basics/objChecker';
import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { Offcanvas } from 'bootstrap';
import JSONEditor from '../../../build/bundle/JSONEditor.mjs';

import tinyLib from '../../files/tinyLib.mjs';
import aiTemplates from '../values/templates.mjs';

import { tinyAi } from './base.mjs';
import ficConfigs from '../values/ficConfigs.mjs';

/**
 * @typedef {'public'|'private'} RpgDataScope
 */

/**
 * @typedef {Object} RpgDataValues
 * @property {boolean} [allowAiUse] - Whether the AI may read this scope.
 * @property {boolean} [allowAiSchemaUse] - Whether the AI may read the schema of this scope.
 */

/**
 * Owns the two JSON Editor instances (public and private) that back the RPG data
 * panels of the AI page.
 *
 * Emits `ready` once both editors finished booting, `change` on every edit and
 * `save` when an offcanvas is closed with pending changes.
 *
 * @extends {EventEmitter}
 */
class RpgData extends EventEmitter {
  /**
   * Creates the empty state for both editors.
   */
  constructor() {
    super();
    /** @type {string|null} */
    this.schemaHash = null;
    /** @type {import('@json-editor/json-editor').JSONEditorOptions<RpgDataValues>} */
    this.template = { schema: {} };
    /** @type {{ public: boolean, private: boolean }} */
    this.allowAiUse = { public: false, private: false };
    /** @type {{ public: boolean, private: boolean }} */
    this.allowAiSchemaUse = { public: false, private: false };
    /** @type {{ public: string|null, private: string|null }} */
    this.hash = { public: null, private: null };
    /** @type {{ public: string|null, private: string|null }} */
    this.oldHash = { public: null, private: null };
    /** @type {{ public: import('tiny-essentials/libs/html/TinyHtml').default<HTMLElement>|null, private: import('tiny-essentials/libs/html/TinyHtml').default<HTMLElement>|null }} */
    this.html = { public: null, private: null };
    /** @type {{ public: Offcanvas|null, private: Offcanvas|null }} */
    this.offcanvas = { public: null, private: null };
    /** @type {{ public: boolean, private: boolean }} */
    this.ready = { public: false, private: false };

    /** @type {{ public: JSONEditor<RpgDataValues>|null, private: JSONEditor<RpgDataValues>|null }} */
    this.data = {
      public: null,
      private: null,
    };

    this.base = {
      public: TinyHtml.createFrom('div', { id: 'info_box' }),
      private: TinyHtml.createFrom('div', { id: 'privateInfo' }),
    };
  }

  /**
   * Parses a JSON string, returning `null` when the payload is invalid.
   *
   * @param {unknown} value - Raw value coming from the editor.
   * @returns {RpgDataValues|null} The parsed object, or `null` when it cannot be parsed.
   */
  // TITLE: Data Filter
  filter(value) {
    let parsed = value;

    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (err) {
        console.error(err);
        parsed = null;
      }
    }

    return isJsonObject(parsed) ? /** @type {RpgDataValues} */ (parsed) : null;
  }

  // TITLE: Config

  /**
   * Stores whether the AI is allowed to read the given data scope.
   *
   * @param {boolean} value - New permission value.
   * @param {RpgDataScope} type - Data scope being updated.
   * @returns {void}
   */
  setAllowAiUse(value, type) {
    if (typeof this.allowAiUse[type] === 'boolean')
      this.allowAiUse[type] = typeof value === 'boolean' ? value : false;
  }

  /**
   * Stores whether the AI is allowed to read the schema of the given scope.
   *
   * @param {boolean} value - New permission value.
   * @param {RpgDataScope} type - Data scope being updated.
   * @returns {void}
   */
  setAllowAiSchemaUse(value, type) {
    if (typeof this.allowAiSchemaUse[type] === 'boolean')
      this.allowAiSchemaUse[type] = typeof value === 'boolean' ? value : false;
  }

  /**
   * Wires the `hide.bs.offcanvas` handler that persists the editors when the
   * user closes them.
   *
   * @param {() => void} updateAiTokenCounterData - Recomputes the token counter after a save.
   * @returns {void}
   */
  // TITLE: Close canvas
  finishOffCanvas(updateAiTokenCounterData) {
    /**
     * @param {RpgDataScope} where
     * @param {string} type
     */
    const onOffCanvasClosed = (where, type) => () => {
      setTimeout(() => {
        const editor = this.data[where];
        if (!editor) return;

        const tinyData = editor.getValue();
        if (!tinyData) return;

        this.setAllowAiUse(Boolean(tinyData.allowAiUse), where);
        this.setAllowAiSchemaUse(Boolean(tinyData.allowAiSchemaUse), where);

        if (editor.isEnabled() && this.hash[where] !== this.oldHash[where]) {
          this.oldHash[where] = this.hash[where];
          tinyAi.setCustomValue(type, null, 0);
          updateAiTokenCounterData();
          this.emit('save', { data: tinyData, type: where });
        }
      }, 300);
    };

    this.html.public?.on('hide.bs.offcanvas', onOffCanvasClosed('public', 'rpgData'));
    this.html.private?.on('hide.bs.offcanvas', onOffCanvasClosed('private', 'rpgPrivateData'));
  }

  /**
   * Builds both offcanvas panels and their Bootstrap instances.
   *
   * @param {import('tiny-essentials/libs/html/TinyHtml').default<HTMLElement>} container - Element the panels are prepended to.
   * @returns {void}
   */
  initOffCanvas(container) {
    // Prepare RPG
    this.html.public = tinyLib.bs.offcanvas('start', 'rpg_ai_base_1', '', this.base.public, true);
    this.html.private = tinyLib.bs.offcanvas('end', 'rpg_ai_base_2', '', this.base.private, false);
    container.prepend(this.html.public, this.html.private);
    this.offcanvas.public = new Offcanvas(/** @type {HTMLElement} */ (this.html.public.get(0)));
    this.offcanvas.private = new Offcanvas(/** @type {HTMLElement} */ (this.html.private.get(0)));
  }

  /**
   * Boots (or reboots) both JSON editors and resolves once they are ready.
   *
   * @param {boolean} [forceRestart=false] - Recreates the editors even when the schema did not change.
   * @returns {Promise<Record<string, RpgDataValues>>} The data loaded into each editor, keyed by scope.
   */
  init(forceRestart = false) {
    return new Promise((resolve, reject) => {
      // Get template
      this.template = {
        // Seed the form with a starting value
        startval: {},
        // Disable additional properties
        no_additional_properties: false,
        // Require all properties by default
        required_by_default: false,
        schema: {},
      };

      // Add custom Schema
      const customSchema = tinyAi.getCustomValue('rpgSchema');
      if (isJsonObject(customSchema)) this.template.schema = customSchema;
      // Default schema
      else {
        this.template.schema = aiTemplates.funcs.jsonTemplate();
        if (ficConfigs.selected) tinyAi.setCustomValue('rpgSchema', this.template.schema, 0);
      }

      const schemaHash = tinyAi.getHash('rpgSchema');

      // Start json
      let failed = false;
      let amountStarted = 0;
      /** @type {Record<string, RpgDataValues>} */
      const loadData = {};
      /**
       * @param {RpgDataScope} where
       * @param {string} valueName
       */
      const startJsonNow = (where, valueName) => {
        try {
          // The tiny start script
          /** @param {boolean} [isFirstTime] */
          const executeTinyStart = (isFirstTime = false) => {
            const rpgEditor = this.data[where];
            if (!rpgEditor) return;

            // Remove first time
            if (isFirstTime) rpgEditor.off('ready', funcExecStart);
            // Get data
            const stored = tinyAi.getCustomValue(valueName);
            loadData[where] = isJsonObject(stored) ? /** @type {RpgDataValues} */ (stored) : {};

            // Insert data
            rpgEditor.setValue(loadData[where]);
            rpgEditor.validate();

            // Change events
            if (!ficConfigs.selected) rpgEditor.disable();
            if (isFirstTime) {
              rpgEditor.on('change', () => {
                rpgEditor.validate();
                if (ficConfigs.selected) {
                  try {
                    const tinyData = rpgEditor.getValue();
                    if (tinyData) {
                      tinyAi.setCustomValue(valueName, tinyData);
                      this.hash[where] = tinyAi.getHash(valueName);
                      this.setAllowAiUse(Boolean(tinyData.allowAiUse), where);
                      this.setAllowAiSchemaUse(Boolean(tinyData.allowAiSchemaUse), where);
                    }
                    this.emit('change', { data: tinyData, type: where });
                  } catch (err) {
                    console.error(err);
                  }
                }
              });
            }

            // Complete
            if (!failed) {
              this.ready[where] = true;
              amountStarted++;
              if (amountStarted >= 2) {
                this.schemaHash = schemaHash;
                resolve(loadData);
                this.emit('ready', { isFirstTime, type: where });
              }
            }
          };
          const funcExecStart = () => executeTinyStart(true);

          // Start json data
          if (this.schemaHash !== schemaHash || !this.data[where] || forceRestart) {
            // Remove Old
            if (this.data[where]) this.data[where].destroy();
            // Insert template
            this.data[where] = new JSONEditor(
              /** @type {HTMLElement} */ (this.base[where].get(0)),
              this.template,
            );

            // Start scripts now
            this.data[where].on('ready', funcExecStart);
          } else executeTinyStart(false);
        } catch (err) {
          // Error!
          console.error(err);
          if (!failed) {
            failed = true;
            reject(
              new Error(
                'An error occurred at booting your RPG. Check your console for more details!',
              ),
            );
          }
        }
      };

      // Read json now
      startJsonNow('public', 'rpgData');
      startJsonNow('private', 'rpgPrivateData');
    });
  }
}

export default RpgData;
