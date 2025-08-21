const storyCfg = {
  // Twitter
  twitter: {
    username: 'JasminDreasond',
  },

  // Donation
  patreon: 'JasminDreasond',
  kofi: 'JasminDreasond',

  dogecoin: {
    address: 'DJn9GGPYsQSGTi6bHDhfgtUpmivBEnDiMK',
    explorer: 'https://dogechain.info/address/',
  },

  bitcoin: {
    address: 'bc1qnk7upe44xrsll2tjhy5msg32zpnqxvyysyje2g',
    explorer: 'https://www.blockchain.com/btc/address/',
  },

  ethereum: {
    address: '0x98d4dC931122118B0fabBaDd5bfF443CeF4E2041',
    explorer: 'https://etherscan.io/address/',
  },

  bnb: {
    address: '0x98d4dC931122118B0fabBaDd5bfF443CeF4E2041',
    explorer: 'https://bscscan.com/address/',
  },

  polygon: {
    address: '0x98d4dC931122118B0fabBaDd5bfF443CeF4E2041',
    explorer: 'https://polygonscan.com/address/',
  },

  // Info
  mastodon: {
    domain: 'equestria.social',
    username: 'JasminDreasond',
  },

  // Info
  mirror: ['ponydriland.jimm.horse'],

  gtag: 'G-PS1R5G3G50',
  domain: 'ponydriland.com',
  itemsPerPage: 100,
  title: 'Pony Driland',
  derpibooru_tag: 'pony+driland',
  blog_url: 'https://blog.ponydriland.com/',
  discordInvite: 'sSkysVtj7y',
  description: 'The dimension of lost creatures and the home of hope.',
  urlPage: null,
  defaultLang: 'en',
  lang: ['en'],
  defaultYoutubeVolume: 100,
  year: 2021,

  news: {
    rss: '',
    url: '',
  },

  contact: 'tiny@ponydriland.com',

  creator: 'Yasmin Seidel (JasminDreasond)',
  creator_url: 'https://jasmindreasond.pony.house',

  github: {
    account: 'Pony-Driland',
    repository: 'Website',
  },

  ageRating: 'teen',
  tags: [
    'fanfic',
    'fic',
    'pony',
    'driland',
    'adventure',
    'action',
    'drama',
    'comedy',
    'fantasy violence',
    'intense violence',
    'strong language',
    'animated blood',
    'horror',
    'pony driland',
  ],

  // Theme
  theme: {
    primary: '#a91126',
    secondary: '#612c36',
    color: '#fff',
    color2: '#e0e0e0',
    color3: 'rgba(255, 255, 255, 0.6)',
    color4: '#5e5e5e',
  },

  noNsfw: ['UK', 'GB'],

  // Mature Content Config (You can freely add as many NSFW filters as you like.)
  nsfw: {
    vore: {
      size: 12,
      aiMsg: true,
      name: 'Vore',
      description:
        'The scale of this content is small to medium. The vore elements are tied to characters for whom this behavior makes narrative sense. By continuing, you acknowledge that you may encounter scenes some audiences could find unsettling or eerie. Disabling this content will not affect the main story. The censored version will simply skip these parts with a brief summary, focusing on essential information for understanding the plot — though some optional canonical details may be missed.',
    },
    questionable: {
      size: 6,
      aiMsg: true,
      name: 'Questionable',
      description:
        'The scale of this content is small. There is no sexually explicit material in the story, but some brief scenes may include questionable content. Disabling this option will skip optional scenes or display censored dialogue instead.',
    },
    extreme_violence: {
      size: 6,
      aiMsg: true,
      name: 'Extreme Violence',
      description:
        'Some battle scenes may contain details that are uncomfortable or potentially nauseating for some readers. Disabling this option will reduce the level of violence in the story. Enable at your own risk — I am not responsible for your choices.',
    },
  },

  // Chapters
  chapterName: {
    1: {
      color: '#000',
      title: 'This is not my world',
      description:
        "The protagonist's early days in the world of Pony Driland. Something mysterious has happened and we need to discover the basics about this mysterious place.",
    },

    2: {
      color: '#000',
      title: 'She hates war',
      description:
        "We have just discovered a mysterious war with some mysterious objective. Maybe she's not feeling comfortable about it.",
    },

    3: {
      color: '#000',
      title: 'They needs help',
      description: 'These ponies need your help. But at the cost of what consequences?',
    },
  },

  // Word Blacklist
  wordCountBlacklick: [],

  // IPFS
  ipfs: {
    host: 'https://cloudflare-ipfs.com/ipfs/{cid}',
    files: {},
  },

  // Ar-Io
  ario: {
    host: 'https://ar-io.dev/{cid}',
    files: {
      '/img/characters/amy/ref.jpg': 'AZhBxGQ1gbgLVp7RDlBqAG-ky37BcwIGIOLXW15Tn9c',
      '/img/characters/amy/wip-collar.jpg': 'F2VfXQrr0UK39bSMSp5M1P0riNeZ5fFE2BE0qh73dmk',

      '/img/characters/beta/aniya/image.png': 'LLZaY7dCEbMPxBig_EYMDj8GbQX5vyVZh6eJ31wmOow',

      '/img/characters/beta/james/old/image.png': '3ReqC2QPg6RpVM508FVjWEBBgxI3hrfkG8YMHUypWGY',

      '/img/characters/rayane/ref.png': 'u4NBTOjArg3WdOoUXft6jbo13q6yNa9D14Zu_hZGUCc',

      '/img/characters/rainbow-queen/ref-dark.jpg': 'Y4r5XCLaD3uXMNvCeENDrBaEBbESu5KLXai7bC5kqRw',
      '/img/characters/rainbow-queen/wip/ref-1.gif': '2l2dbZxB292CsGBi7-1qtPTXvvjCRmYQiauD1LahdB4',
      '/img/characters/rainbow-queen/ref-dark.webp': '0SyvCKcKbsVSxaEW3DGl6D-EKjlJJCT36wjkLO8htok',
      '/img/gallery/chapter1-gift.jpg': 'VtXS4VqRDljlQdVtE5gTaQQyR2bPuOv-YDK6AQ4xF_k',
      '/img/characters/rainbow-queen/scythe.gif': 'EGwe6QEqi2PP2bhJP1OcXj_QZOC_Gwin20b9DiC83sk',

      '/img/characters/whistler/wip/headshot.png': 'vm8s0QOvBKAmOyUq5Nf6iFo9ybaEq8-Qg7z_co2oW_M',

      '/img/characters/blue-screen/ref.jpg': '5og2tDBMNV0EwLBZcRA6bwytRJDJDXK76DVvrz0XDBk',

      '/img/characters/princess-ariella/ref.png': 'LHFvTaQPlHbDnc4vM_xLQ0LWH8ypdqtSccgApjFatq8',

      '/img/characters/prisma/old/ref.jpg': 'HD4luK_pU20Xwe1SM6em0h9-5DI_h2wSgdQTBbXj8y8',

      '/img/characters/layla/ref.jpg': 'shHPlacMUy7JWHqNO0GQPZitOyDdFFv7UsgktT69c1A',
    },
  },
};

export default storyCfg;
