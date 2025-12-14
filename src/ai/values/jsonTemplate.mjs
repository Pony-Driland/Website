import aiTemplates from './templates.mjs';

// https://github.com/json-editor/json-editor?tab=readme-ov-file
aiTemplates.funcs.jsonTemplate = () => {
  const rpgBase = {
    // Generator
    generator: {
      // Character List
      characterList: (data) => {
        // Result Data
        const resultData = {
          title: data.title,
          description: data.description,
          type: 'array',
          id: data.id,
          options: {
            collapsed: true,
          },
          items: {
            title: data.itemTitle,
            headerTemplate: '{{self.name}}',
            type: 'object',
            id: data.itemID,
            options: {
              collapsed: true,
            },
            // Base
            properties: {
              name: { type: 'string', title: '🧑 Name', description: 'The name of the character.' },
              race: {
                type: 'string',
                title: '🧬 Race',
                description: 'The race or species of the character.',
              },
              location: {
                type: 'string',
                title: '📍 Location',
                description: 'Where the character is located in the game world.',
              },
              coins: {
                type: 'number',
                title: '🪙 Coins',
                minimum: 0,
                description: 'Amount of coins the character possesses.',
              },
              gender: {
                type: 'string',
                title: '♀️♂️ Gender',
                description: 'The gender of the character.',
              },
              level: {
                type: 'number',
                title: '📊 Level',
                minimum: 1,
                description: 'The level of the character.',
              },
              class: {
                type: 'string',
                title: '🎓 Class',
                description: 'The class of the character (e.g., Warrior, Mage).',
              },
              experience: {
                type: 'number',
                title: '✨ Experience',
                minimum: 0,
                description: 'The experience points the character has earned.',
              },
              attack: {
                type: 'number',
                title: '⚔️ Attack',
                minimum: 0,
                description: "The character's attack power.",
              },
              defense: {
                type: 'number',
                title: '🛡️ Defense',
                minimum: 0,
                description: "The character's defense power.",
              },
              totalhp: {
                type: 'number',
                title: '💖 Total HP',
                minimum: 1,
                description: 'The maximum health points of the character.',
              },
              hp: {
                type: 'number',
                title: '❤️ HP',
                minimum: 0,
                description: 'The current health points of the character.',
              },
              mana: {
                type: 'number',
                title: '🔮 Mana',
                minimum: 0,
                description: "The character's mana, used for casting spells.",
              },
              proficiency: {
                title: '🎯 Proficiencies',
                type: 'array',
                id: 'proficiencies',
                description:
                  'A list of proficiencies or skills the character excels in, such as weapon types, magical abilities, or other talents.',
                options: { collapsed: true },
                items: {
                  title: '🎯 Proficiency',
                  headerTemplate: '{{self.name}}',
                  type: 'object',
                  id: 'item',
                  options: { collapsed: true },
                  properties: {
                    name: {
                      type: 'string',
                      title: '📜 Title',
                      minLength: 1,
                      description: 'The title of the proficiency.',
                    },
                    items: {
                      type: 'string',
                      title: '📖 Proficiency',
                      minLength: 1,
                      description:
                        'List of proficiencies or areas the character is skilled in (e.g., Archery, Stealth).',
                    },
                  },
                },
              },
              alignment: {
                type: 'string',
                title: '⚖️ Alignment',
                description: "The character's moral alignment (e.g., Lawful Good, Chaotic Evil).",
              },
              background: {
                type: 'string',
                format: 'textarea',
                title: '📜 Background',
                description: 'A brief history or backstory of the character.',
              },
              dead: {
                type: 'boolean',
                title: '☠️ Dead',
                description: 'Indicates whether the character is dead.',
              },
              fainted: {
                type: 'boolean',
                title: '💫 Fainted',
                description: 'Indicates whether the character is currently fainted.',
              },
              inventory: {
                title: '🎒 Inventory',
                type: 'array',
                id: 'inventory',
                options: { collapsed: true },
                description:
                  'A list of items the character carries, including weapons, tools, and other important belongings.',
                items: {
                  title: '📦 Item',
                  headerTemplate: '{{self.name}} ({{self.amount}})',
                  type: 'object',
                  id: 'item',
                  options: { collapsed: true },
                  properties: {
                    name: {
                      type: 'string',
                      title: '📦 Name',
                      minLength: 1,
                      description: 'The name of the item.',
                    },
                    amount: {
                      type: 'number',
                      title: '🔢 Amount',
                      minimum: 1,
                      description: 'How many units of this item the character has.',
                    },
                  },
                },
              },
              equipment: {
                title: '🧥 Equipment',
                type: 'array',
                id: 'equipment',
                description:
                  'A collection of items the character can equip, like weapons, armor, and accessories, each providing bonuses or abilities to enhance performance.',
                options: { collapsed: true },
                items: {
                  headerTemplate: '{{self.name}}',
                  title: '🧥 Equipment',
                  type: 'object',
                  id: 'equip',
                  options: { collapsed: true },
                  properties: {
                    name: {
                      type: 'string',
                      title: '📦 Name',
                      minLength: 1,
                      description: 'The name of the equipment.',
                    },
                    type: {
                      type: 'string',
                      title: '📜 Type',
                      description: 'The type of equipment (e.g., Weapon, Armor).',
                    },
                    stats: {
                      type: 'object',
                      title: '📊 Stats',
                      description:
                        'The stats or bonuses provided by the equipment (e.g., +5 Attack).',
                      properties: {
                        attack: {
                          type: 'number',
                          title: '⚔️ Attack',
                          minimum: 0,
                          description: 'The attack bonus provided by the equipment.',
                        },
                        defense: {
                          type: 'number',
                          title: '🛡️ Defense',
                          minimum: 0,
                          description: 'The defense bonus provided by the equipment.',
                        },
                      },
                    },
                  },
                },
              },
              skills: {
                title: '🧠 Skills',
                type: 'array',
                id: 'skills',
                options: { collapsed: true },
                description:
                  'A list of skills the character has acquired, showcasing their abilities and expertise in various areas.',
                items: {
                  title: '🧠 Skill',
                  headerTemplate: '{{self.name}} ({{self.amount}})',
                  type: 'object',
                  id: 'skill',
                  options: { collapsed: true },
                  properties: {
                    name: {
                      type: 'string',
                      title: '📦 Name',
                      minLength: 1,
                      description: 'The name of the skill.',
                    },
                    amount: {
                      type: 'number',
                      title: '🔢 Amount',
                      minimum: 0,
                      description: 'How skilled the character is in this ability.',
                    },
                    cost: {
                      type: 'number',
                      title: '💰 Cost',
                      minimum: 0,
                      description: 'The cost (e.g., mana or stamina) to use this skill.',
                    },
                  },
                },
              },
              relationships: {
                title: '🤝 Relationships',
                type: 'array',
                id: 'relationships',
                description:
                  'A list of relationships the character has with others, such as friends, enemies, allies, or rivals, influencing interactions and story progression.',
                options: { collapsed: true },
                items: {
                  title: '🤝 Relationship',
                  type: 'object',
                  id: 'relationship',
                  options: { collapsed: true },
                  properties: {
                    name: {
                      type: 'string',
                      title: '🧑 Name',
                      description:
                        'The name of the individual the character has a relationship with.',
                    },
                    type: {
                      type: 'string',
                      title: '🏷️ Type',
                      description: 'The type of relationship (e.g., Friend, Rival, Ally).',
                    },
                    status: {
                      type: 'string',
                      title: '📶 Status',
                      description:
                        'The current status of the relationship (e.g., Friendly, Hostile).',
                    },
                    notes: {
                      type: 'string',
                      format: 'textarea',
                      title: '📝 Notes',
                      description: 'Any additional notes about the relationship.',
                    },
                  },
                },
              },
              about: {
                type: 'string',
                format: 'textarea',
                title: '📖 About',
                description: 'Additional details or backstory for the character.',
              },
            },
          },
        };
        if (data.mascot) {
          resultData.items.properties.mascot = rpgBase.generator.characterList({
            title: '🐾 Mascots',
            description:
              'A list of mascots that accompany the character, offering unique abilities and support in quests and battles.',
            id: 'mascots',
            itemTitle: 'Mascot',
            itemID: 'mascot',
          });
        }
        return resultData;
      },
    },
    // Data
    data: {
      title: 'RPG',
      type: 'object',
      id: 'data',
      options: { collapsed: false },
      // Base
      properties: {
        // AI Stuff
        allowAiUse: {
          type: 'boolean',
          title: '🤖 Allow AI Prompt Usage (BETA)',
          description: 'Allow AI to use this data for generative content in future responses.',
        },
        allowAiSchemaUse: {
          type: 'boolean',
          title: '🧠 Allow AI Schema Prompt Usage (BETA)',
          description:
            'Allow AI to use the schema data for generative content in future responses.',
        },
        // Comments List
        comments: {
          title: '📝 Comments',
          type: 'array',
          id: 'comments',
          options: { collapsed: true },
          description:
            'Flexible comment system organized by custom categories. Useful for notes, lore, session logs, GM reminders, or anything else.',
          items: {
            title: '📂 Category',
            headerTemplate: '{{self.name}}',
            type: 'object',
            id: 'comment_category',
            options: { collapsed: true },
            properties: {
              name: {
                type: 'string',
                title: '📂 Category Name',
                minLength: 1,
                description: 'Custom name for this comment category.',
              },
              comments: {
                headerTemplate: '{{self.length}} Comments',
                title: '📝 Comments',
                type: 'array',
                id: 'category_comments',
                options: { collapsed: false },
                description: 'List of comments inside this category.',
                items: {
                  title: '💬 Comment',
                  headerTemplate: '{{self.title}}',
                  type: 'object',
                  id: 'comment',
                  options: { collapsed: false },
                  properties: {
                    title: {
                      type: 'string',
                      title: '📜 Title',
                      description: 'Optional title for the comment.',
                    },
                    text: {
                      type: 'string',
                      format: 'textarea',
                      title: '🧾 Text',
                      description: 'The main content of the comment.',
                    },
                    author: {
                      type: 'string',
                      title: '✍️ Author',
                      description: 'Who wrote this comment.',
                    },
                    createdAt: {
                      type: 'string',
                      title: '📅 Created At',
                      description: 'Date or in-game time when this comment was created.',
                    },
                  },
                },
              },
            },
          },
        },
        // Clock
        clock: {
          type: 'string',
          title: '⏰ Clock',
          description: 'In-game time or any time-related information for the RPG session.',
        },
        // Location
        location: {
          type: 'string',
          title: '🌍 Location',
          description: 'The current location or setting of the RPG session.',
        },
        // Skills Wiki
        skills: {
          title: '📚 Skills',
          type: 'array',
          id: 'skills',
          options: { collapsed: true },
          description: 'List of available skills in the RPG world.',
          items: {
            title: '🧠 Skill',
            headerTemplate: '{{self.name}}',
            type: 'object',
            id: 'skill',
            options: { collapsed: true },
            properties: {
              name: {
                type: 'string',
                title: '🪄 Name',
                minLength: 1,
                description: 'The name of the skill (e.g., Fireball, Stealth, Healing).',
              },
              about: {
                type: 'string',
                format: 'textarea',
                title: '📖 About',
                description: 'A brief description of the skill, its effects, and limitations.',
              },
              level: {
                type: 'number',
                title: '📈 Level',
                description: "The skill's rank, affecting its power and effectiveness.",
                minimum: 1,
              },
              cost: {
                type: 'number',
                title: '🔥 Cost',
                description: 'The resource cost (mana, stamina, etc.) to use the skill.',
                minimum: 0,
              },
              cooldown: {
                type: 'number',
                title: '⏱️ Cooldown',
                description: 'The time before the skill can be used again (in turns or seconds).',
                minimum: 0,
              },
            },
          },
        },
        // Settings
        settings: {
          title: '⚙️ Settings',
          type: 'object',
          id: 'data',
          options: { collapsed: false },
          description: 'Game settings and configurations for the RPG session.',
          // Base
          properties: {
            // Items Wiki
            items: {
              title: '🏪 Items',
              type: 'array',
              id: 'items',
              options: { collapsed: true },
              description: 'A collection of items available in the RPG world.',
              items: {
                title: '📦 Item',
                headerTemplate: '{{self.name}}',
                type: 'object',
                id: 'item',
                options: { collapsed: true },
                properties: {
                  name: {
                    type: 'string',
                    title: '📦 Name',
                    minLength: 1,
                    description: 'The name of the item.',
                  },
                  price: {
                    type: 'number',
                    title: '💰 Price',
                    minimum: 0,
                    description: 'The cost of the item in the RPG world.',
                  },
                  cities: {
                    type: 'string',
                    title: '📍 Locations',
                    format: 'textarea',
                    description: 'Locations where the item is available or restricted.',
                  },
                  about: {
                    type: 'string',
                    format: 'textarea',
                    title: '📖 About',
                    description: 'A description of the item and its uses.',
                  },
                  rarity: {
                    type: 'string',
                    title: '💎 Rarity',
                    description: 'The rarity of the item (e.g., Common, Rare, Legendary).',
                  },
                  weight: {
                    type: 'number',
                    title: '⚖️ Weight',
                    minimum: 0,
                    description: 'The weight of the item, affecting inventory space.',
                  },
                  effects: {
                    type: 'string',
                    title: '✨ Effects',
                    format: 'textarea',
                    description: 'Any special effects or buffs the item provides.',
                  },
                  durability: {
                    type: 'number',
                    title: '🪨 Durability',
                    minimum: 0,
                    description: 'How much the item can be used before breaking or deteriorating.',
                  },
                  use: {
                    type: 'string',
                    title: '▶️ Use',
                    description:
                      'How the item is used in the game (e.g., Equip, Consume, Activate).',
                  },
                },
              },
            },
            // Maps
            maps: {
              title: '🗺️ Maps',
              type: 'array',
              id: 'maps_v1',
              options: { collapsed: true },
              description: 'Collection of maps for the RPG world.',
              items: {
                title: '🗺️ Map',
                headerTemplate: '{{self.name}}',
                type: 'object',
                id: 'map',
                options: { collapsed: true },
                properties: {
                  name: {
                    type: 'string',
                    title: '📍 Name',
                    minLength: 1,
                    description: 'The name of the map.',
                  },
                  defaultColor: {
                    type: 'string',
                    title: '🎨 Default Color Code',
                    description:
                      'The default color code used for the map, leave empty for transparent (Empty to Transparent).',
                  },
                  size: {
                    type: 'string',
                    title: '📐 Image Size',
                    description:
                      'Dimensions of the map image (maximum allowed size) (width X height) (Max 4000x4000).',
                  },
                  tile: {
                    type: 'string',
                    title: '🧩 Tile Size',
                    description:
                      'Dimensions of individual map tiles (width X height) (Max 4000x4000).',
                  },
                  /* image: {
                    type: 'string',
                    title: 'Image URL',
                    description: 'URL to the image file representing the map.',
                  }, */
                  about: {
                    type: 'string',
                    format: 'textarea',
                    title: '📖 About',
                    description: 'A description of the map and its significance in the RPG world.',
                  },
                  routes: {
                    title: '🛤️ Routes',
                    type: 'array',
                    id: 'routes',
                    options: { collapsed: true },
                    description: 'List of travel routes within the map.',
                    items: {
                      title: '🛤️ Route',
                      headerTemplate: '{{i}}',
                      type: 'object',
                      id: 'route',
                      options: { collapsed: true },
                      properties: {
                        color: {
                          type: 'string',
                          title: '🎨 Color Code',
                          description:
                            'Color code for the route on the map (Empty to Transparent).',
                        },
                        fontColor: {
                          type: 'string',
                          title: '🖍️ Font Color Code',
                          description:
                            'Font color code for text along the route (Empty to Default).',
                        },
                        coordinates: {
                          type: 'string',
                          title: '📌 Coordinates',
                          description:
                            'Coordinates indicating the start and end points of the route (Width x Height).',
                        },
                        about: {
                          type: 'string',
                          format: 'textarea',
                          title: '📖 About',
                          description: 'A description of the route and its purpose.',
                        },
                      },
                    },
                  },
                  locations: {
                    title: '🧭 Locations',
                    type: 'array',
                    id: 'locations',
                    options: { collapsed: true },
                    description: 'Locations available on the map.',
                    items: {
                      title: '📍 Location',
                      headerTemplate: '{{self.name}}',
                      type: 'object',
                      id: 'location',
                      options: { collapsed: true },
                      properties: {
                        name: {
                          type: 'string',
                          title: '🗺️ Name',
                          minLength: 1,
                          description: 'The name of the location on the map.',
                        },
                        mininame: {
                          type: 'string',
                          title: '🏷️ Mini Name',
                          description: 'A shorter name or alias for the location.',
                        },
                        shop: {
                          type: 'boolean',
                          title: '🏪 Enable Shop',
                          description: 'Indicates if there is a shop available at this location.',
                        },
                        color: {
                          type: 'string',
                          title: '🎨 Color Code',
                          description:
                            'Color code associated with the location on the map (Empty to Transparent).',
                        },
                        fontColor: {
                          type: 'string',
                          title: '🖍️ Font Color Code',
                          description:
                            'Font color code for text at the location (Empty to Default).',
                        },
                        coordinates: {
                          type: 'string',
                          title: '📌 Coordinates',
                          description:
                            'Coordinates marking the location on the map (Width x Height).',
                        },
                        about: {
                          type: 'string',
                          format: 'textarea',
                          title: '📖 About',
                          description:
                            'A description of the location and its importance in the game.',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  // Character Generator
  rpgBase.generator.characters = {
    teamCharacters: rpgBase.generator.characterList({
      title: '🛡️ Team Characters',
      description:
        'A list of characters in the team or party who assist in quests, battles, and story progression, with unique interactions with the main character.',
      id: 'teamCharacters',
      itemTitle: 'Character',
      itemID: 'Character',
      mascot: true,
    }),

    specialCharacters: rpgBase.generator.characterList({
      title: '⭐ Special Characters',
      description:
        'A list of key characters with special abilities, unique backgrounds, or significant roles in the story and quests.',
      id: 'specialCharacters',
      itemTitle: 'Character',
      itemID: 'Character',
      mascot: true,
    }),

    villainsCharacters: rpgBase.generator.characterList({
      title: '😈 Villains Characters',
      description:
        'A list of antagonists or villains who oppose the protagonist, with their own motives, abilities, and goals.',
      id: 'villainsCharacters',
      itemTitle: 'Character',
      itemID: 'Character',
      mascot: true,
    }),
  };

  // Editor
  const schema = rpgBase.data;

  // Insert Characters
  for (const item in rpgBase.generator.characters) {
    schema.properties[item] = rpgBase.generator.characters[item];
  }

  // Complete
  return schema;
};
