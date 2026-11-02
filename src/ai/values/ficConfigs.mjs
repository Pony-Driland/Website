import { ficCache } from '../../important.mjs';
import { saveRoleplayFormat } from '../../start.mjs';

const ficConfigs = {
  /**
   * Describes a single AI chat preset available in the AI page sidebar.
   *
   * @typedef {Object} FicConfigsData
   * @property {string} title - Label shown on the sidebar button.
   * @property {string} id - Unique preset id, also used as the AI session id.
   * @property {string|null} template - Key of the instruction template in `aiTemplates.instructions`, or `null` for a blank session.
   * @property {string} icon - Font Awesome class list used as the button icon.
   * @property {boolean} [isSafe] - Whether the preset is safe for users who did not pass age verification.
   * @property {string} intro - Introductory message injected when the preset is loaded offline.
   * @property {() => Promise<{ data: string; mime: string }|null>} getData - Builds the fic payload sent to the model.
   */

  /** @type {FicConfigsData[]} */
  data: [
    {
      title: 'Safe Talk',
      id: 'ficTalkSfw',
      template: 'talkToFicSfw',
      icon: 'fa-solid fa-book-open',
      isSafe: true,
      intro:
        'Welcome to talk about the fic Pony Driland! I will answer all your questions related to fic in your native language (if i can support to do this). I will try to hide some explicit details from fic, but if you insist, I will try to say in a few details.',
      getData: async () => {
        /** @type {{ data: string; mime: string; }} */
        const data = saveRoleplayFormat(null, false) ?? {
          data: '',
          mime: 'text/plain',
        };
        data.data = `${ficCache.charPrompts}\n\n${data.data}`;
        return data;
      },
    },
    {
      title: 'Full Talk',
      id: 'ficTalk',
      template: 'talkToFic',
      icon: 'fa-solid fa-book-open-reader',
      intro:
        'Welcome to talk about the fic Pony Driland! I will answer all your questions related to fic in your native language (if i can support to do this), but be careful, because I will answer questions related to literally anything that happened in fic, including censored scenes (but i will do this respecting the limitations of my selected model).',
      getData: async () => {
        /** @type {{ data: string; mime: string; }} */
        const data = saveRoleplayFormat(null, false) ?? {
          data: '',
          mime: 'text/plain',
        };
        data.data = `${ficCache.charPrompts}\n\n${data.data}`;
        return data;
      },
    },
    {
      title: 'Sandbox',
      id: 'sandBoxFic',
      template: 'sandBoxToFic',
      icon: 'fa-solid fa-fill-drip',
      intro:
        'Welcome to sandbox of the fic Pony Driland! This is my purely sandbox version, that means I have no special configuration, allowing you to do whatever you want within the limits of your selected model.',
      getData: async () => {
        /** @type {{ data: string; mime: string; }} */
        const data = saveRoleplayFormat(null, false, {
          ficLine: false,
          dayNumber: false,
        }) ?? { data: '', mime: 'text/plain' };
        data.data = `${ficCache.charPrompts}\n\n${data.data}`;
        return data;
      },
    },
    {
      title: 'No Data',
      id: 'noData',
      template: null,
      icon: 'fa-solid fa-file',
      intro:
        'You are in a completely clean environment, with no stored data from the fic. You can use all website features without any limitations.',
      getData: async () => null,
    },
  ],

  /** @type {any[]} */
  buttons: [],
  /** @type {null|string} */
  selected: null,
  /** @type {null} */
  contentsMd5: null,
};

export default ficConfigs;
