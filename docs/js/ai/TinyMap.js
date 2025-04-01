class TinyMap {
  constructor(map, firstBuild = true) {
    // Data
    this.map = map;
    this.html = {};
    this._limitSize = 4000;
    this._isSubPage = false;

    // Design
    this.image = typeof this.map.image === 'string' ? this.map.image : '';
    this.defaultColor = typeof this.map.defaultColor === 'string' ? this.map.defaultColor : '';

    // Size
    this.setSize(this.map.size.split('x'), false);
    this.setTile(this.map.tile.split('x'), false);
    this._setGrid();

    // Locations
    this.locations = Array.isArray(this.map.locations) ? this.map.locations : [];
    this.routes = Array.isArray(this.map.routes) ? this.map.routes : [];

    // First build
    if (firstBuild) this.buildMap(true);
  }

  // Validate Size
  sizeIsValidated() {
    return (
      !Number.isNaN(this.size[0]) &&
      !Number.isNaN(this.size[1]) &&
      !Number.isNaN(this.tile[0]) &&
      !Number.isNaN(this.tile[1]) &&
      Number.isFinite(this.size[0]) &&
      Number.isFinite(this.size[1]) &&
      Number.isFinite(this.tile[0]) &&
      Number.isFinite(this.tile[1])
    );
  }

  // Set grid
  _setGrid() {
    this.grid = {
      height: Math.round(this.size[1] / this.tile[1]),
      width: Math.round(this.size[0] / this.tile[0]),
    };
  }

  // Set map name
  setMapName(name) {
    this.name = name;
    if (this.html.mapButton) this.html.mapButton.text(name);
  }

  // Set size
  setSize(size = [], setGrid = true) {
    // Size
    this.size = size;
    this.size[0] = Number(this.size[0]);
    this.size[1] = Number(this.size[1]);

    // Limit
    if (this.size[0] > this._limitSize) {
      this.size[0] = this._limitSize;
    }

    if (this.size[0] > this._limitSize) {
      this.size[0] = this._limitSize;
    }

    // Set grid
    if (setGrid) return this._setGrid();
  }

  // Set tile
  setTile(tile = [], setGrid = true) {
    // Tile
    this.tile = tile;
    this.tile[0] = Number(this.tile[0]);
    this.tile[1] = Number(this.tile[1]);

    // Limit
    if (this.tile[1] > this._limitSize) {
      this.tile[1] = this._limitSize;
    }

    if (this.tile[1] > this._limitSize) {
      this.tile[1] = this._limitSize;
    }

    // Set grid
    if (setGrid) return this._setGrid();
  }

  // Empty function in map html
  emptyMap() {
    this.html.table.empty();
  }

  _buildGridTemplate(cw = 0, ch = 0, text = null, color = null) {
    return $('<td>', {
      class: 'p-0 m-0',
      coordinates:
        typeof cw === 'number' && typeof ch === 'number' ? Number(cw) + 'x' + Number(ch) : null,
    })
      .css({
        height: this.tile[1] - 2,
        width: this.tile[0] - 2,
        'background-color': color,
      })
      .text(text);
  }

  // Map Html
  buildMapGrid() {
    // Prepare Table
    this.html.grid = [];
    this.emptyMap();

    // Generator Height
    const firstValue = {
      height: true,
      width: true,
    };

    let coordinates_w = 0;
    let coordinates_h = -1;

    // Render grid
    for (let i = 0; i < this.grid.height + 1; i++) {
      const tinytr = $('<tr>', { class: 'p-0 m-0' });
      const tinytds = [];

      // Height
      if (!firstValue.height) {
        firstValue.width = true;

        // Generator Width
        coordinates_h = 0;
        for (let x = 0; x < this.grid.width + 1; x++) {
          if (!firstValue.width) {
            tinytds.push(
              this._buildGridTemplate(
                Number(coordinates_w),
                Number(coordinates_h),
                null,
                this.defaultColor,
              ),
            );
          } else {
            tinytds.push(this._buildGridTemplate(null, null, coordinates_w + 1));
            coordinates_w++;
            firstValue.width = false;
          }

          coordinates_h++;
        }
      } else {
        firstValue.height = false;

        // Generator Width
        coordinates_h = -1;
        for (let x = 0; x < this.grid.width + 1; x++) {
          tinytds.push(this._buildGridTemplate(null, null, coordinates_h + 1));
          coordinates_h++;
        }
      }

      // Insert
      if (this.html.table) this.html.table.append(tinytr.append(tinytds));
      this.html.grid.push({ html: tinytr, data: tinytds });
    }
  }

  updateGridContent() {
    // Routes Generator
    const tinyThis = this;
    const getCoordPlace = (coords) => {
      const coordinates = coords.split('x');
      coordinates[0] = Number(coordinates[0]);
      coordinates[1] = Number(coordinates[1]);

      if (!Number.isNaN(coordinates[0]) && !Number.isNaN(coordinates[1])) {
        const cordsValue = coordinates[0] + 'x' + coordinates[1];
        for (const index in tinyThis.html.grid) {
          const coordBase = tinyThis.html.grid[index].data.find(
            (item) => item.attr('coordinates') === cordsValue,
          );
          if (coordBase) return coordBase;
        }
      }
      return null;
    };

    for (const item2 in this.routes) {
      const coordplace = getCoordPlace(this.routes[item2].coordinates);
      if (coordplace) {
        const routeNumber = item2;
        if (this.routes[item2].about) {
          coordplace.attr(
            'title',
            'Route {number}: {about}'
              .replace(/\{number\}/g, routeNumber)
              .replace(/\{about\}/g, this.routes[item2].about),
          );
        } else {
          coordplace.attr('title', 'Route {number}'.replace(/\{number\}/g, routeNumber));
        }

        coordplace.tooltip();
        coordplace.text('R' + routeNumber);

        if (this.routes[item2].color) {
          coordplace.css('background-color', this.routes[item2].color);
        }

        if (this.routes[item2].fontColor) {
          coordplace.css('color', this.routes[item2].fontColor);
        }
      }
    }

    // Locations Generator
    for (const item2 in this.locations) {
      const coordplace = getCoordPlace(this.locations[item2].coordinates);
      if (coordplace) {
        coordplace.attr('title', this.locations[item2].name);
        const tooltip = coordplace.tooltip(null, null, true);

        coordplace.text(this.locations[item2].mininame);
        if (this.locations[item2].color) {
          coordplace.css('background-color', this.locations[item2].color);
        }

        if (this.locations[item2].fontColor) {
          coordplace.css('color', this.locations[item2].fontColor);
        }

        // Click Location
        const tinyThis = this;
        coordplace
          .css('cursor', 'pointer')
          .data('tinyLocation', this.locations[item2])
          .on('click', function () {
            console.log('Tiny location time!');
            // Prepare Click
            const tinyLocation = $(this).data('tinyLocation');

            // Get Items
            let tinyItems;

            try {
              tinyItems = rpgData.data[place].getEditor('root.settings.items').getValue();
            } catch (err) {
              tinyItems = null;
            }

            // Items Shop
            const tinyShop = [];

            // Items
            if (Array.isArray(tinyItems) && tinyLocation.shop) {
              for (const item in tinyItems) {
                // Cities of the Item
                let cancity = false;
                let alllocations = false;
                if (typeof tinyItems[item].cities === 'string') {
                  // The cities
                  const tinyCities = [];
                  const tinyCities1 = tinyItems[item].cities.split(',');
                  const tinyCities2 = tinyItems[item].cities.split('\n');

                  if (tinyCities1.length > 0)
                    for (const index in tinyCities1) tinyCities.push(tinyCities1[index]);
                  else if (tinyCities2.length > 0)
                    for (const index in tinyCities2) tinyCities.push(tinyCities2[index]);

                  // Load Cities
                  for (const city in tinyCities) {
                    tinyCities[city] = tinyCities[city].trim();
                    if (tinyCities[city] === 'all') {
                      cancity = true;
                      alllocations = true;
                    }

                    // Tiny fix
                    if (tinyCities[city] === tinyThis.locations[item2].name && !alllocations) {
                      cancity = true;
                      break;
                    } else if (
                      alllocations &&
                      tinyCities[city] === tinyThis.locations[item2].name
                    ) {
                      cancity = false;
                      break;
                    }
                  }
                }

                // Add to the list
                if (cancity) {
                  let separeItem = '';
                  if (Number(item) !== Number(tinyItems.length - 1)) {
                    separeItem = $('<hr>');
                  }
                  tinyShop.push(
                    $('<div>').append([
                      $('<span>').text(`Name: `),
                      $('<span>').text(tinyItems[item].name),
                      $('<br>'),
                      $('<span>').text(`Price: `),
                      $('<span>').text(tinyItems[item].price),
                      $('<br>'),
                      $('<span>').text(`About: `),
                      $('<span>').text(tinyItems[item].about),
                      separeItem,
                    ]),
                  );
                }
              }
            }

            // Modal Body
            const tinyBody = [
              // Info
              $('<h3>').text('Info'),
              $('<div>').text(tinyLocation.about),
            ];

            if (tinyShop.length > 0) {
              tinyBody.push($('<hr>'), $('<h3>').text('Shop'));
              for (const item2 in tinyShop) {
                tinyBody.push(tinyShop[item2]);
              }
            }

            tinyThis.html.subPage = {
              html: tinyBody,
              title: 'Location - {location}'.replace(/\{location\}/g, tinyLocation.name),
            };

            tinyThis.activeSubPage(true);
            if (tooltip) tooltip.hide();
          });
      }
    }
  }

  updateMapSize() {
    this.html.table.css({
      width: this.size[0] + this.tile[0],
      height: this.size[1] + this.tile[1],
    });
  }

  updateMapImage() {
    this.html.table.css({
      background: this.image ? 'transparent url("' + this.image + '") no-repeat right bottom' : '',
      'background-size': this.image ? this.size[0] + 'px ' + Number(this.size[1] - 2) + 'px' : '',
    });
  }

  buildPage(tinyHtml, title = null, className = null) {
    this.html.base
      .empty()
      .append(
        typeof title === 'string' ? $('<h3>').text(title) : null,
        $('<div>', { class: className }).append(tinyHtml),
      );
  }

  activeSubPage(active = true) {
    this._isSubPage = active;
    if (!active)
      this.buildPage(
        this.html.table,
        Number(this.html.table.outerWidth(true) - this.tile[0]) +
          'x' +
          Number(this.html.table.outerHeight(true) - this.tile[1]),
        'table-responsive',
      );
    else this.buildPage(this.html.subPage.html, this.html.subPage.title);
  }

  buildMap(resetHtml = false) {
    // The map
    const tinyThis = this;
    if (resetHtml) this.html.base = $('<center>', { class: 'd-none' });

    // The table
    if (resetHtml) this.html.table = $('<table>', { class: 'table table-bordered' });
    this.updateMapSize();
    this.updateMapImage();

    // Insert map table into map element
    this.buildMapGrid();
    this.updateGridContent();

    // Map Button
    if (resetHtml)
      this.html.mapButton = $('<button>', {
        type: 'button',
        class: 'btn btn-secondary m-2',
      }).on('click', () => {
        if (tinyThis._isSubPage) {
          tinyThis.buildMap();
          tinyThis.html.base.removeClass('d-none');
        } else tinyThis.html.base.toggleClass('d-none');
      });

    // Set name
    this.setMapName(typeof this.map.name === 'string' ? this.map.name : '');

    // Build page
    this.activeSubPage(false);
  }

  getMapButton() {
    return this.html.mapButton;
  }

  getMapHtml() {
    return this.html.table;
  }

  getMapBaseHtml() {
    return this.html.base;
  }
}
