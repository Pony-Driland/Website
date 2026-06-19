import EventEmitter from 'events';
import { isJsonObject } from 'tiny-essentials/basics';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import { Offcanvas } from 'bootstrap';
import JSONEditor from '../../../build/bundle/JSONEditor.mjs';

import tinyLib from '../../files/tinyLib.mjs';
import aiTemplates from '../values/templates.mjs';

import { tinyAi } from './base.mjs';
import ficConfigs from '../values/ficConfigs.mjs';

/** @typedef {import("json-editor")} JSONEditor */

class RpgData extends EventEmitter {
  constructor() {
    super();
    this.schemaHash = null;
    this.allowAiUse = { public: false, private: false };
    this.allowAiSchemaUse = { public: false, private: false };
    this.hash = { public: null, private: null };
    this.oldHash = { public: null, private: null };
    this.html = { public: null, private: null };
    this.offcanvas = { public: null, private: null };
    this.ready = { public: false, private: false };

    this.data = {
      /** @type {null|JSONEditor} */
      public: null,
      /** @type {null|JSONEditor} */
      private: null,
    };

    this.base = {
      public: TinyHtml.createFrom('div', { id: 'info_box' }),
      private: TinyHtml.createFrom('div', { id: 'privateInfo' }),
    };
  }

  // TITLE: Data Filter
  filter(value) {
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (err) {
        console.error(err);
        value = null;
      }
    }

    return value;
  }

  // TITLE: Config
  setAllowAiUse(value, type) {
    if (typeof this.allowAiUse[type] === 'boolean')
      this.allowAiUse[type] = typeof value === 'boolean' ? value : false;
  }
  setAllowAiSchemaUse(value, type) {
    if (typeof this.allowAiSchemaUse[type] === 'boolean')
      this.allowAiSchemaUse[type] = typeof value === 'boolean' ? value : false;
  }

  // TITLE: Close canvas
  finishOffCanvas(updateAiTokenCounterData) {
    /**
     * @param {'public'|'private'} where
     * @param {string} type
     */
    const onOffCanvasClosed = (where, type) => () => {
      setTimeout(() => {
        // Data
        const tinyData = this.data[where].getValue();
        if (tinyData) {
          this.setAllowAiUse(tinyData.allowAiUse, where);
          this.setAllowAiSchemaUse(tinyData.allowAiSchemaUse, where);

          if (this.data[where].isEnabled() && this.hash[where] !== this.oldHash[where]) {
            this.oldHash[where] = this.hash[where];
            tinyAi.setCustomValue(type, null, 0);
            updateAiTokenCounterData();
            this.emit('save', { data: tinyData, type: where });
          }
        }
      }, 300);
    };

    this.html.public.on('hide.bs.offcanvas', onOffCanvasClosed('public', 'rpgData'));
    this.html.private.on('hide.bs.offcanvas', onOffCanvasClosed('private', 'rpgPrivateData'));
  }

  initOffCanvas(container) {
    // Prepare RPG
    this.html.public = tinyLib.bs.offcanvas('start', 'rpg_ai_base_1', '', this.base.public, true);
    this.html.private = tinyLib.bs.offcanvas('end', 'rpg_ai_base_2', '', this.base.private, false);
    container.prepend(this.html.public, this.html.private);
    this.offcanvas.public = new Offcanvas(this.html.public.get(0));
    this.offcanvas.private = new Offcanvas(this.html.private.get(0));
  }

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
      const loadData = {};
      const startJsonNow = (where, valueName) => {
        try {
          // The tiny start script
          const executeTinyStart = (isFirstTime = false) => {
            const rpgEditor = this.data[where];
            // Remove first time
            if (isFirstTime) rpgEditor.off('ready', funcExecStart);
            // Get data
            loadData[where] = tinyAi.getCustomValue(valueName);
            if (!isJsonObject(loadData[where])) loadData[where] = {};

            // Insert data
            rpgEditor.setValue(this.filter(loadData[where]));
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
                      this.setAllowAiUse(tinyData.allowAiUse, where);
                      this.setAllowAiSchemaUse(tinyData.allowAiSchemaUse, where);
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
            this.data[where] = new JSONEditor(this.base[where].get(0), this.template);

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
