import { saveRoleplayFormat } from '../../start.mjs';

const ficConfigs = {
  data: [
    {
      title: 'Safe Talk',
      id: 'ficTalkSfw',
      template: 'talkToFicSfw',
      icon: 'fa-solid fa-book-open',
      isSafe: true,
      intro:
        'Welcome to talk about the fic Pony Driland! I will answer all your questions related to fic in your native language (if i can support to do this). I will try to hide some explicit details from fic, but if you insist, I will try to say in a few details.',
      getData: async () => saveRoleplayFormat(null, false),
    },
    {
      title: 'Full Talk',
      id: 'ficTalk',
      template: 'talkToFic',
      icon: 'fa-solid fa-book-open-reader',
      intro:
        'Welcome to talk about the fic Pony Driland! I will answer all your questions related to fic in your native language (if i can support to do this), but be careful, because I will answer questions related to literally anything that happened in fic, including censored scenes (but i will do this respecting the limitations of my selected model).',
      getData: async () => saveRoleplayFormat(null, false),
    },
    {
      title: 'Sandbox',
      id: 'sandBoxFic',
      template: 'sandBoxToFic',
      icon: 'fa-solid fa-fill-drip',
      intro:
        'Welcome to sandbox of the fic Pony Driland! This is my purely sandbox version, that means I have no special configuration, allowing you to do whatever you want within the limits of your selected model.',
      getData: async () =>
        saveRoleplayFormat(null, false, {
          ficLine: false,
          dayNumber: false,
        }),
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
  buttons: [],
  selected: null,
  contentsMd5: null,
};

export default ficConfigs;
