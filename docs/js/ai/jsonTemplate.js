aiTemplates.funcs.jsonTemplate = function () {
  const rpgBase = {
    // Generator
    generator: {
      // Character List
      characterList: function (data) {
        // Result Data
        const resultData = {
          title: data.title,
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
              name: { type: 'string', title: 'Name' },
              race: { type: 'string', title: 'Race' },
              location: { type: 'string', title: 'Location' },
              coins: { type: 'number', title: 'Coins', minimum: 0 },
              gender: { type: 'string', title: 'Gender' },
              totalhp: { type: 'number', title: 'Total HP', minimum: 1 },
              hp: { type: 'number', title: 'HP', minimum: 0 },
              mana: { type: 'number', title: 'Mana', minimum: 0 },
              attack: { type: 'number', title: 'Attack', minimum: 0 },
              defense: { type: 'number', title: 'Defense', minimum: 0 },
              dead: { type: 'boolean', title: 'Dead' },
              fainted: { type: 'boolean', title: 'Fainted' },
              inventory: {
                title: 'Inventory',
                type: 'array',
                id: 'inventory',
                options: { collapsed: true },
                items: {
                  title: 'Item',
                  headerTemplate: '{{self.name}} ({{self.amount}})',
                  type: 'object',
                  id: 'item',
                  options: { collapsed: true },
                  properties: {
                    name: { type: 'string', title: 'Name', minLength: 1 },
                    amount: { type: 'number', title: 'Amount', minimum: 1 },
                  },
                },
              },
              skills: {
                title: 'Skills',
                type: 'array',
                id: 'skills',
                options: { collapsed: true },
                items: {
                  title: 'Skill',
                  headerTemplate: '{{self.name}} ({{self.amount}})',
                  type: 'object',
                  id: 'skill',
                  options: { collapsed: true },
                  properties: {
                    name: { type: 'string', title: 'Name', minLength: 1 },
                    amount: { type: 'number', title: 'Amount', minimum: 0 },
                    cost: { type: 'number', title: 'Cost', minimum: 0 },
                  },
                },
              },
              about: { type: 'string', format: 'textarea', title: 'About' },
            },
          },
        };
        if (data.mascot) {
          resultData.items.properties.mascot = rpgBase.generator.characterList({
            title: 'Mascots',
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
        allowAiUse: { 
            type: 'boolean', 
            title: 'Allow AI Prompt Usage',
            description: 'You will allow Ai to use this data within the prompt for generative content of your next messages.',
        },
        comments: { type: 'string', format: 'textarea', title: 'Comments' },
        clock: { type: 'string', title: 'Clock' },
        location: { type: 'string', title: 'Location' },
        // Skills Wiki
        skills: {
          title: 'Skills',
          type: 'array',
          id: 'skills',
          options: { collapsed: true },
          items: {
            title: 'Skill',
            headerTemplate: '{{self.name}}',
            type: 'object',
            id: 'skill',
            options: { collapsed: true },
            properties: {
              name: { type: 'string', title: 'Name', minLength: 1 },
              about: { type: 'string', format: 'textarea', title: 'About' },
            },
          },
        },
        // Settings
        settings: {
          title: 'Settings',
          type: 'object',
          id: 'data',
          options: { collapsed: false },
          // Base
          properties: {
            // Items Wiki
            items: {
              title: 'Items',
              type: 'array',
              id: 'items',
              options: { collapsed: true },
              items: {
                title: 'Item',
                headerTemplate: '{{self.name}}',
                type: 'object',
                id: 'item',
                options: { collapsed: true },
                properties: {
                  name: { type: 'string', title: 'Name', minLength: 1 },
                  price: { type: 'number', title: 'Price', minimum: 0 },
                  cities: {
                    type: 'string',
                    title: 'Locations',
                    format: 'textarea',
                    description:
                      'Type "all" to apply everywhere and invert the list to create a blacklist.',
                  },
                  about: { type: 'string', format: 'textarea', title: 'About' },
                },
              },
            },
            // Maps
            maps: {
              title: 'Maps',
              type: 'array',
              id: 'maps_v1',
              options: { collapsed: true },
              items: {
                title: 'Map',
                headerTemplate: '{{self.name}}',
                type: 'object',
                id: 'map',
                options: { collapsed: true },
                properties: {
                  name: { type: 'string', title: 'Name', minLength: 1 },
                  defaultColor: { type: 'string', title: 'Default Color Code (Empty to Transparent)' },
                  size: { type: 'string', title: 'Image Size (width X height) (Max 4000x4000)' },
                  tile: { type: 'string', title: 'Tile Size (width X height) (Max 4000x4000)' },
                  image: { type: 'string', title: 'Image URL' },
                  about: { type: 'string', format: 'textarea', title: 'About' },
                  routes: {
                    title: 'Routes',
                    type: 'array',
                    id: 'routes',

                    options: {
                      collapsed: true,
                    },

                    items: {
                      title: 'Route',
                      headerTemplate: '{{i}}',
                      type: 'object',
                      id: 'route',
                      options: {
                        collapsed: true,
                      },
                      properties: {
                        color: {
                          type: 'string',
                          title: 'Color Code (Empty to Transparent)',
                        },
                        fontColor: {
                          type: 'string',
                          title: 'Font Color Code (Empty to Default)',
                        },
                        coordinates: {
                          type: 'string',
                          title: 'Coordinates (Width x Height)',
                        },
                        about: {
                          type: 'string',
                          format: 'textarea',
                          title: 'About',
                        },
                      },
                    },
                  },
                  locations: {
                    title: 'Locations',
                    type: 'array',
                    id: 'locations',

                    options: {
                      collapsed: true,
                    },

                    items: {
                      title: 'Location',
                      headerTemplate: '{{self.name}}',
                      type: 'object',
                      id: 'location',
                      options: {
                        collapsed: true,
                      },
                      properties: {
                        name: {
                          type: 'string',
                          title: 'Name',
                          minLength: 1,
                        },
                        mininame: {
                          type: 'string',
                          title: 'Mini Name',
                        },
                        shop: {
                          type: 'boolean',
                          title: 'Enable Shop',
                        },
                        color: {
                          type: 'string',
                          title: 'Color Code (Empty to Transparent)',
                        },
                        fontColor: {
                          type: 'string',
                          title: 'Font Color Code (Empty to Default)',
                        },
                        coordinates: {
                          type: 'string',
                          title: 'Coordinates (Width x Height)',
                        },
                        about: {
                          type: 'string',
                          format: 'textarea',
                          title: 'About',
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
      title: 'Team Characters',
      id: 'teamCharacters',
      itemTitle: 'Character',
      itemID: 'Character',
      mascot: true,
    }),

    specialCharacters: rpgBase.generator.characterList({
      title: 'Special Characters',
      id: 'specialCharacters',
      itemTitle: 'Character',
      itemID: 'Character',
      mascot: true,
    }),

    villainsCharacters: rpgBase.generator.characterList({
      title: 'Villains Characters',
      id: 'villainsCharacters',
      itemTitle: 'Character',
      itemID: 'Character',
      mascot: true,
    }),
  };

  // Editor
  const jsonEditorTemplate = {
    schema: rpgBase.data,

    // Seed the form with a starting value
    startval: {},

    // Disable additional properties
    no_additional_properties: false,

    // Require all properties by default
    required_by_default: false,
  };

  // Insert Characters
  for (const item in rpgBase.generator.characters) {
    jsonEditorTemplate.schema.properties[item] = rpgBase.generator.characters[item];
  }

  // Complete
  return jsonEditorTemplate;
};
