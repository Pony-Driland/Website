
if(!storyCfg.custom_url) { storyCfg.custom_url = {}; }
storyCfg.characters = {
  "amy": {
    "path": "/data/characters/amy/README.md",
    "url": "/characters/amy.html",
    "title": "Amy",
    "description": "Amy is one of Rainbow Queen's pets. Her sweet personality was a result of past events of her accidentally going to Pony Driland. Her accident happened right during her childhood when she ran away from home, which made it impossible for her to grow like the other ponies, and she ended up spending the rest of her childhood struggling to survive on her own until she became an adult."
  },
  "aniya": {
    "path": "/data/characters/aniya/README.md",
    "url": "/characters/aniya.html",
    "title": "Aniya",
    "description": ""
  },
  "james": {
    "path": "/data/characters/james/README.md",
    "url": "/characters/james.html",
    "title": "James",
    "description": "James is one of the scientists responsible for developing the source code that helped create the Pony Driland dimension. James' journey involves discovering what happened to the dimension, while sadly suffering from the loss of his original dimension."
  },
  "layla": {
    "path": "/data/characters/layla/README.md",
    "url": "/characters/layla.html",
    "title": "Layla",
    "description": "Layla is one of Rainbow Queen's pets. Her sweet personality was a result of past events of her accidentally going to Pony Driland. Like Amy... Her accident happened right during her childhood when she ran away from home, which made it impossible for her to grow like the other ponies, and she ended up spending the rest of her childhood struggling to survive on her own until she became an adult."
  },
  "princess-ariella": {
    "path": "/data/characters/princess-ariella/README.md",
    "url": "/characters/princess-ariella.html",
    "title": "Princess Ariella",
    "description": "Ariella was the first princess of her kingdom founded by her. she has a pure heart and loves all of her creation and her kingdom very much. For her, the lives of everyone in her kingdom matters a lot. Her determination to make the kingdom a better place is extremely high. She could sacrifice herself if necessary just to save her kingdom life."
  },
  "prisma": {
    "path": "/data/characters/prisma/README.md",
    "url": "/characters/prisma.html",
    "title": "Prisma",
    "description": "One of the oldest unicorns in all Pony Driland. She's story has a direct involvement with the Royal Color. She is one of the closest ponies to the Rainbow Queen within the Royal Color family."
  },
  "rainbow-queen": {
    "path": "/data/characters/rainbow-queen/README.md",
    "url": "/characters/rainbow-queen.html",
    "title": "Rainbow Queen",
    "description": "The giant Sphinx goddess of darkness from Pony Driland. The one that takes care of all the darkness of the dimension. Also responsible for dimension energy and life-death passage."
  },
  "rayane": {
    "path": "/data/characters/rayane/README.md",
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
