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
              name: { type: 'string', title: 'Name', description: 'Character name' },
              race: { type: 'string', title: 'Race', description: 'Character race or species' },
              location: {
                type: 'string',
                title: 'Location',
                description: 'Current location of the character',
              },
              coins: {
                type: 'number',
                title: 'Coins',
                minimum: 0,
                description: 'Amount of coins the character has',
              },
              gender: { type: 'string', title: 'Gender', description: 'Character gender' },
              totalhp: {
                type: 'number',
                title: 'Total HP',
                minimum: 1,
                description: 'Maximum health points',
              },
              hp: { type: 'number', title: 'HP', minimum: 0, description: 'Current health points' },
              mana: {
                type: 'number',
                title: 'Mana',
                minimum: 0,
                description: 'Character mana points for magic use',
              },
              attack: {
                type: 'number',
                title: 'Attack',
                minimum: 0,
                description: 'Attack power of the character',
              },
              defense: {
                type: 'number',
                title: 'Defense',
                minimum: 0,
                description: 'Defensive capability of the character',
              },
              dead: {
                type: 'boolean',
                title: 'Dead',
                description: 'Indicates if the character is dead',
              },
              fainted: {
                type: 'boolean',
                title: 'Fainted',
                description: 'Indicates if the character is unconscious',
              },
              inventory: {
                title: 'Inventory',
                type: 'array',
                id: 'inventory',
                options: { collapsed: true },
                description: 'List of items the character carries',
                items: {
                  title: 'Item',
                  headerTemplate: '{{self.name}} ({{self.amount}})',
                  type: 'object',
                  id: 'item',
                  options: { collapsed: true },
                  properties: {
                    name: { type: 'string', title: 'Name', minLength: 1, description: 'Item name' },
                    amount: {
                      type: 'number',
                      title: 'Amount',
                      minimum: 1,
                      description: 'Quantity of the item',
                    },
                  },
                },
              },
              skills: {
                title: 'Skills',
                type: 'array',
                id: 'skills',
                options: { collapsed: true },
                description: 'List of skills the character has',
                items: {
                  title: 'Skill',
                  headerTemplate: '{{self.name}} ({{self.amount}})',
                  type: 'object',
                  id: 'skill',
                  options: { collapsed: true },
                  properties: {
                    name: {
                      type: 'string',
                      title: 'Name',
                      minLength: 1,
                      description: 'Skill name',
                    },
                    amount: {
                      type: 'number',
                      title: 'Amount',
                      minimum: 0,
                      description: 'Skill level or power',
                    },
                    cost: {
                      type: 'number',
                      title: 'Cost',
                      minimum: 0,
                      description: 'Cost to use the skill',
                    },
                  },
                },
              },
              about: {
                type: 'string',
                format: 'textarea',
                title: 'About',
                description: 'Character background and details',
              },
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
          title: 'Allow AI Prompt Usage (BETA)',
          description: 'Allow AI to use this data for generative content in future responses.',
        },
        comments: {
          type: 'string',
          format: 'textarea',
          title: 'Comments',
          description: 'Any additional comments or notes about the RPG session.',
        },
        clock: {
          type: 'string',
          title: 'Clock',
          description: 'In-game time or any time-related information for the RPG session.',
        },
        location: {
          type: 'string',
          title: 'Location',
          description: 'The current location or setting of the RPG session.',
        },
        // Skills Wiki
        skills: {
          title: 'Skills',
          type: 'array',
          id: 'skills',
          options: { collapsed: true },
          description: 'List of available skills in the RPG world.',
          items: {
            title: 'Skill',
            headerTemplate: '{{self.name}}',
            type: 'object',
            id: 'skill',
            options: { collapsed: true },
            properties: {
              name: {
                type: 'string',
                title: 'Name',
                minLength: 1,
                description: 'The name of the skill.',
              },
              about: {
                type: 'string',
                format: 'textarea',
                title: 'About',
                description: 'A description of how the skill works or its effects.',
              },
            },
          },
        },
        // Settings
        settings: {
          title: 'Settings',
          type: 'object',
          id: 'data',
          options: { collapsed: false },
          description: 'Game settings and configurations for the RPG session.',
          // Base
          properties: {
            // Items Wiki
            items: {
              title: 'Items',
              type: 'array',
              id: 'items',
              options: { collapsed: true },
              description: 'A collection of items available in the RPG world.',
              items: {
                title: 'Item',
                headerTemplate: '{{self.name}}',
                type: 'object',
                id: 'item',
                options: { collapsed: true },
                properties: {
                  name: {
                    type: 'string',
                    title: 'Name',
                    minLength: 1,
                    description: 'The name of the item.',
                  },
                  price: {
                    type: 'number',
                    title: 'Price',
                    minimum: 0,
                    description: 'The cost of the item in the RPG world.',
                  },
                  cities: {
                    type: 'string',
                    title: 'Locations',
                    format: 'textarea',
                    description:
                      'List of locations where the item is available or restricted. Type "all" for all locations, or invert the list for blacklisting locations.',
                  },
                  about: {
                    type: 'string',
                    format: 'textarea',
                    title: 'About',
                    description: 'A description of the item and its uses.',
                  },
                },
              },
            },
            // Maps
            maps: {
              title: 'Maps',
              type: 'array',
              id: 'maps_v1',
              options: { collapsed: true },
              description: 'Collection of maps for the RPG world.',
              items: {
                title: 'Map',
                headerTemplate: '{{self.name}}',
                type: 'object',
                id: 'map',
                options: { collapsed: true },
                properties: {
                  name: {
                    type: 'string',
                    title: 'Name',
                    minLength: 1,
                    description: 'The name of the map.',
                  },
                  defaultColor: {
                    type: 'string',
                    title: 'Default Color Code',
                    description:
                      'The default color code used for the map, leave empty for transparent (Empty to Transparent).',
                  },
                  size: {
                    type: 'string',
                    title: 'Image Size',
                    description:
                      'Dimensions of the map image (maximum allowed size) (width X height) (Max 4000x4000).',
                  },
                  tile: {
                    type: 'string',
                    title: 'Tile Size',
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
                    title: 'About',
                    description: 'A description of the map and its significance in the RPG world.',
                  },
                  routes: {
                    title: 'Routes',
                    type: 'array',
                    id: 'routes',
                    options: { collapsed: true },
                    description: 'List of travel routes within the map.',
                    items: {
                      title: 'Route',
                      headerTemplate: '{{i}}',
                      type: 'object',
                      id: 'route',
                      options: { collapsed: true },
                      properties: {
                        color: {
                          type: 'string',
                          title: 'Color Code',
                          description:
                            'Color code for the route on the map (Empty to Transparent).',
                        },
                        fontColor: {
                          type: 'string',
                          title: 'Font Color Code',
                          description:
                            'Font color code for text along the route (Empty to Default).',
                        },
                        coordinates: {
                          type: 'string',
                          title: 'Coordinates',
                          description:
                            'Coordinates indicating the start and end points of the route (Width x Height).',
                        },
                        about: {
                          type: 'string',
                          format: 'textarea',
                          title: 'About',
                          description: 'A description of the route and its purpose.',
                        },
                      },
                    },
                  },
                  locations: {
                    title: 'Locations',
                    type: 'array',
                    id: 'locations',
                    options: { collapsed: true },
                    description: 'Locations available on the map.',
                    items: {
                      title: 'Location',
                      headerTemplate: '{{self.name}}',
                      type: 'object',
                      id: 'location',
                      options: { collapsed: true },
                      properties: {
                        name: {
                          type: 'string',
                          title: 'Name',
                          minLength: 1,
                          description: 'The name of the location on the map.',
                        },
                        mininame: {
                          type: 'string',
                          title: 'Mini Name',
                          description: 'A shorter name or alias for the location.',
                        },
                        shop: {
                          type: 'boolean',
                          title: 'Enable Shop',
                          description: 'Indicates if there is a shop available at this location.',
                        },
                        color: {
                          type: 'string',
                          title: 'Color Code (Empty to Transparent)',
                          description: 'Color code associated with the location on the map.',
                        },
                        fontColor: {
                          type: 'string',
                          title: 'Font Color Code (Empty to Default)',
                          description: 'Font color code for text at the location.',
                        },
                        coordinates: {
                          type: 'string',
                          title: 'Coordinates (Width x Height)',
                          description: 'Coordinates marking the location on the map.',
                        },
                        about: {
                          type: 'string',
                          format: 'textarea',
                          title: 'About',
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
