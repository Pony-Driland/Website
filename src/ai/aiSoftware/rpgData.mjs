import { objType } from 'tiny-essentials';
import $ from 'jquery';
import { Offcanvas } from 'bootstrap';
import JSONEditor from '../../../build/bundle/JSONEditor.mjs';

import tinyLib from '../../files/tinyLib.mjs';
import aiTemplates from '../templates.mjs';

class RpgData {
  constructor() {
    this.schemaHash = null;
    this.allowAiUse = { public: false, private: false };
    this.allowAiSchemaUse = { public: false, private: false };
    this.hash = { public: null, private: null };
    this.oldHash = { public: null, private: null };
    this.html = { public: null, private: null };
    this.offcanvas = { public: null, private: null };
    this.ready = { public: false, private: false };
    this.data = { public: null, private: null };
    this.base = {
      public: $('<div>', { id: 'info_box' }),
      private: $('<div>', { id: 'privateInfo' }),
    };
  }

  setTinyAi(tinyAi) {
    this.tinyAi = tinyAi;
  }

  setFicConfigs(ficConfigs) {
    this.ficConfigs = ficConfigs;
  }

  // Data Filter
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

  setAllowAiUse(value, type) {
    if (typeof this.allowAiUse[type] === 'boolean')
      this.allowAiUse[type] = typeof value === 'boolean' ? value : false;
  }
  setAllowAiSchemaUse(value, type) {
    if (typeof this.allowAiSchemaUse[type] === 'boolean')
      this.allowAiSchemaUse[type] = typeof value === 'boolean' ? value : false;
  }

  finishOffCanvas(updateAiTokenCounterData) {
    const rpgData = this;
    const tinyAi = this.tinyAi;
    // offCanvas closed
    const onOffCanvasClosed = (where, type) => () => {
      setTimeout(() => {
        const tinyData = rpgData.data[where].getValue();
        if (tinyData) {
          rpgData.setAllowAiUse(tinyData.allowAiUse, where);
          rpgData.setAllowAiSchemaUse(tinyData.allowAiSchemaUse, where);
          if (rpgData.data[where].isEnabled() && rpgData.hash[where] !== rpgData.oldHash[where]) {
            rpgData.oldHash[where] = rpgData.hash[where];
            tinyAi.setCustomValue(type, null, 0);
            updateAiTokenCounterData();
          }
        }
      }, 300);
    };
    this.html.public
      .get(0)
      .addEventListener('hide.bs.offcanvas', onOffCanvasClosed('public', 'rpgData'));
    this.html.private
      .get(0)
      .addEventListener('hide.bs.offcanvas', onOffCanvasClosed('private', 'rpgPrivateData'));
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
    const rpgData = this;
    const tinyAi = this.tinyAi;
    const ficConfigs = this.ficConfigs;
    return new Promise((resolve, reject) => {
      // Get template
      rpgData.template = {
        // Seed the form with a starting value
        startval: {},
        // Disable additional properties
        no_additional_properties: false,
        // Require all properties by default
        required_by_default: false,
      };

      // Add custom Schema
      const customSchema = tinyAi.getCustomValue('rpgSchema');
      if (objType(customSchema, 'object')) rpgData.template.schema = customSchema;
      // Default schema
      else {
        rpgData.template.schema = aiTemplates.funcs.jsonTemplate();
        if (ficConfigs.selected) tinyAi.setCustomValue('rpgSchema', rpgData.template.schema, 0);
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
            const rpgEditor = rpgData.data[where];
            // Remove first time
            if (isFirstTime) rpgEditor.off('ready', funcExecStart);
            // Get data
            loadData[where] = tinyAi.getCustomValue(valueName);
            if (!objType(loadData[where], 'object')) loadData[where] = {};

            // Insert data
            rpgEditor.setValue(rpgData.filter(loadData[where]));
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
                      rpgData.hash[where] = tinyAi.getHash(valueName);
                      rpgData.setAllowAiUse(tinyData.allowAiUse, where);
                      rpgData.setAllowAiSchemaUse(tinyData.allowAiSchemaUse, where);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }
              });
            }

            // Complete
            if (!failed) {
              rpgData.ready[where] = true;
              amountStarted++;
              if (amountStarted >= 2) {
                rpgData.schemaHash = schemaHash;
                resolve(loadData);
              }
            }
          };
          const funcExecStart = () => executeTinyStart(true);

          // Start json data
          if (rpgData.schemaHash !== schemaHash || !rpgData.data[where] || forceRestart) {
            // Remove Old
            if (rpgData.data[where]) rpgData.data[where].destroy();
            // Insert template
            rpgData.data[where] = new JSONEditor(rpgData.base[where].get(0), rpgData.template);

            // Start scripts now
            rpgData.data[where].on('ready', funcExecStart);
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
