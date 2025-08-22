import storyCfg from './config.mjs';

if (!storyCfg.custom_url) {
  storyCfg.custom_url = {};
}
storyCfg.characters = {
  rayane: {
    path: '/data/characters/rayane/README.md',
    url: '/characters/rayane.html',
    title: 'Rayane',
    description:
      "Rayane is one of Pony Driland's most mysterious ponies. There are many legends about her role and why she is always spying on other ponies. What is known is that she is a talented swordsman and she has some spells that are considered extremely rare in Pony Driland like Teleport and regeneration magic.",
  },
  'rainbow-queen': {
    path: '/data/characters/rainbow-queen/README.md',
    url: '/characters/rainbow-queen.html',
    title: 'Rainbow Queen',
    description:
      'The giant Sphinx goddess of darkness from Pony Driland. The one that takes care of all the darkness of the dimension. Also responsible for dimension energy and life-death passage.',
  },
  prisma: {
    path: '/data/characters/prisma/README.md',
    url: '/characters/prisma.html',
    title: 'Prisma',
    description:
      "One of the oldest unicorns in all Pony Driland. She's story has a direct involvement with the Royal Color. She is one of the closest ponies to the Rainbow Queen within the Royal Color family.",
  },
  'princess-ariella': {
    path: '/data/characters/princess-ariella/README.md',
    url: '/characters/princess-ariella.html',
    title: 'Princess Ariella',
    description:
      'Ariella was the first princess of her kingdom founded by her. she has a pure heart and loves all of her creation and her kingdom very much. For her, the lives of everyone in her kingdom matters a lot. Her determination to make the kingdom a better place is extremely high. She could sacrifice herself if necessary just to save her kingdom life.',
  },
  layla: {
    path: '/data/characters/layla/README.md',
    url: '/characters/layla.html',
    title: 'Layla',
    description:
      "Layla is one of Rainbow Queen's pets. Her sweet personality was a result of past events of her accidentally going to Pony Driland. Like Amy... Her accident happened right during her childhood when she ran away from home, which made it impossible for her to grow like the other ponies, and she ended up spending the rest of her childhood struggling to survive on her own until she became an adult.",
  },
  james: {
    path: '/data/characters/james/README.md',
    url: '/characters/james.html',
    title: 'James',
    description:
      "James is one of the scientists responsible for developing the source code that helped create the Pony Driland dimension. James' journey involves discovering what happened to the dimension, while sadly suffering from the loss of his original dimension.",
  },
  aniya: {
    path: '/data/characters/aniya/README.md',
    url: '/characters/aniya.html',
    title: 'Aniya',
    description: 'The mysterious gypsy pony of Blackburn Village.',
  },
  amy: {
    path: '/data/characters/amy/README.md',
    url: '/characters/amy.html',
    title: 'Amy',
    description:
      "Amy is one of Rainbow Queen's pets. Her sweet personality was a result of past events of her accidentally going to Pony Driland. Her accident happened right during her childhood when she ran away from home, which made it impossible for her to grow like the other ponies, and she ended up spending the rest of her childhood struggling to survive on her own until she became an adult.",
  },
  'npc/unicorn-soldier': {
    path: '/data/characters/npc/unicorn-soldier/README.md',
    url: '/characters/npc/unicorn-soldier.html',
  },
  'npc/sniper': {
    path: '/data/characters/npc/sniper/README.md',
    url: '/characters/npc/sniper.html',
  },
  'npc/signed': {
    path: '/data/characters/npc/signed/README.md',
    url: '/characters/npc/signed.html',
  },
  'npc/salespony': {
    path: '/data/characters/npc/salespony/README.md',
    url: '/characters/npc/salespony.html',
  },
  'npc/random-female-pony': {
    path: '/data/characters/npc/random-female-pony/README.md',
    url: '/characters/npc/random-female-pony.html',
  },
  'npc/pony': {
    path: '/data/characters/npc/pony/README.md',
    url: '/characters/npc/pony.html',
  },
  'npc/machinist-pony': {
    path: '/data/characters/npc/machinist-pony/README.md',
    url: '/characters/npc/machinist-pony.html',
  },
  'npc/letter': {
    path: '/data/characters/npc/letter/README.md',
    url: '/characters/npc/letter.html',
  },
  'npc/hospital-attendant': {
    path: '/data/characters/npc/hospital-attendant/README.md',
    url: '/characters/npc/hospital-attendant.html',
  },
  'npc/gypsy': {
    path: '/data/characters/npc/gypsy/README.md',
    url: '/characters/npc/gypsy.html',
  },
  'npc/guard': {
    path: '/data/characters/npc/guard/README.md',
    url: '/characters/npc/guard.html',
  },
  'npc/guard-951': {
    path: '/data/characters/npc/guard-951/README.md',
    url: '/characters/npc/guard-951.html',
  },
  'npc/guard-4': {
    path: '/data/characters/npc/guard-4/README.md',
    url: '/characters/npc/guard-4.html',
  },
  'npc/guard-3': {
    path: '/data/characters/npc/guard-3/README.md',
    url: '/characters/npc/guard-3.html',
  },
  'npc/guard-2': {
    path: '/data/characters/npc/guard-2/README.md',
    url: '/characters/npc/guard-2.html',
  },
  'npc/guard-1': {
    path: '/data/characters/npc/guard-1/README.md',
    url: '/characters/npc/guard-1.html',
  },
  'npc/female-unicorn': {
    path: '/data/characters/npc/female-unicorn/README.md',
    url: '/characters/npc/female-unicorn.html',
  },
  'npc/employee': {
    path: '/data/characters/npc/employee/README.md',
    url: '/characters/npc/employee.html',
  },
  'npc/doctor': {
    path: '/data/characters/npc/doctor/README.md',
    url: '/characters/npc/doctor.html',
  },
  'npc/delivery-boy': {
    path: '/data/characters/npc/delivery-boy/README.md',
    url: '/characters/npc/delivery-boy.html',
  },
  'npc/cashier': {
    path: '/data/characters/npc/cashier/README.md',
    url: '/characters/npc/cashier.html',
  },
};
for (const item in storyCfg.characters) {
  storyCfg.custom_url[storyCfg.characters[item].path] = {
    url: storyCfg.characters[item].url,
    title: storyCfg.characters[item].title,
  };
}
