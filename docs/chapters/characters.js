
if(!storyCfg.custom_url) { storyCfg.custom_url = {}; }
storyCfg.characters = {
  "amy": {
    "path": "/img/characters/amy/README.md",
    "url": "/characters/amy.html",
    "title": "Amy",
    "description": "Amy is one of Rainbow Queen's pets. Her sweet personality was a result of past events of her accidentally going to Pony Driland. Her accident happened right during her childhood when she ran away from home, which made it impossible for her to grow like the other ponies, and she ended up spending the rest of her childhood struggling to survive on her own until she became an adult."
  },
  "layla": {
    "path": "/img/characters/layla/README.md",
    "url": "/characters/layla.html",
    "title": "Layla",
    "description": "Layla is one of Rainbow Queen's pets. Her sweet personality was a result of past events of her accidentally going to Pony Driland. Like Amy... Her accident happened right during her childhood when she ran away from home, which made it impossible for her to grow like the other ponies, and she ended up spending the rest of her childhood struggling to survive on her own until she became an adult."
  },
  "princess-ariella": {
    "path": "/img/characters/princess-ariella/README.md",
    "url": "/characters/princess-ariella.html",
    "title": "Princess Ariella",
    "description": "Ariella was the first princess of her kingdom founded by her. she has a pure heart and loves all of her creation and her kingdom very much. For her, the lives of everyone in her kingdom matters a lot. Her determination to make the kingdom a better place is extremely high. She could sacrifice herself if necessary just to save her kingdom life."
  },
  "prisma": {
    "path": "/img/characters/prisma/README.md",
    "url": "/characters/prisma.html",
    "title": "Prisma",
    "description": "One of the oldest unicorns in all of Pony Driland. She's story has a direct involvement with the Royal Color. She belongs to the closest hierarchy to the Rainbow Queen."
  },
  "rainbow-queen": {
    "path": "/img/characters/rainbow-queen/README.md",
    "url": "/characters/rainbow-queen.html",
    "title": "Rainbow Queen",
    "description": "The giant Sphinx goddess of darkness from Pony Driland. The one that takes care of all the darkness of the dimension. Also responsible for dimension energy and life-death passage."
  },
  "rayane": {
    "path": "/img/characters/rayane/README.md",
    "url": "/characters/rayane.html",
    "title": "Rayane",
    "description": "Rayane is one of Pony Driland's most mysterious ponies. There are many legends about her role and why she is always spying on other ponies. What is known is that she is a talented swordsman and she has some spells that are considered extremely rare in Pony Driland like Teleport and regeneration magic."
  }
};
for(const item in storyCfg.characters) {
    storyCfg.custom_url[storyCfg.characters[item].path] = {
        url: storyCfg.characters[item].url,
        title: storyCfg.characters[item].title
    };
}
