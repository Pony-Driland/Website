import $ from 'jquery';

/*
 * TinyMap - A lightweight map generator and handler
 *
 * Author: JasminDreasond
 * Description: This script is an adaptation of an older version used in an RPG page of the application called MyOC Page.
 *
 * This class provides functionalities to build and manage a grid-based map, allowing for the placement of locations and routes dynamically.
 * The map can be updated in real-time, and interactions such as tooltips and click events enhance the user experience.
 *
 * Features:
 * - Dynamic map creation using a grid system
 * - Supports customizable tile sizes and map dimensions
 * - Allows adding locations and routes with colors, names, and tooltips
 * - Interactive elements for displaying additional information
 * - Easy integration with RPG systems and other applications
 *
 * Documentation created by: ChatGPT (OpenAI)
 */

class TinyMap {
  /**
   * Creates a new TinyMap instance.
   * @param {Object} map - The map configuration containing size, tile dimensions, image, colors, locations, and routes.
   * @param {boolean} [firstBuild=false] - Determines if the map should be built immediately.
   */
  constructor(map, firstBuild = false) {
    // Data
    this.map = map;
    this.html = {};
    this.location = null;
    this._limitSize = 4000;
    this._isSubPage = false;

    // Design
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
    this.setMapImage(this.map.image);
  }

  /**
   * Validates a background-image value restricted to safe data:image URLs only.
   *
   * @private
   * @param {string} value - The CSS background-image value.
   * @returns {boolean}
   */
  #isValidDataImage(value) {
    if (typeof value !== 'string') return false;

    const normalized = value.trim();

    // Only allow data:image/... base64 or URL-encoded images
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+\/=]+$/i;

    return dataUrlPattern.test(normalized);
  }

  /**
   * Sets the current location for the RPG map.
   *
   * Updates the internal `location` property.
   * Accepts only string values; if a non-string is provided,
   * the location is set to `null`.
   *
   * @param {string} location - The name or identifier of the map location.
   */
  setLocation(location) {
    this.location = typeof location === 'string' ? location : null;
  }

  /**
   * Validates the size and tile dimensions of the map.
   * Ensures that all size and tile values are numbers and finite.
   *
   * @returns {boolean} - True if size and tile dimensions are valid, false otherwise.
   */
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

  /**
   * Calculates and sets the grid dimensions based on the map size and tile size.
   * The grid represents how many tiles fit within the map's dimensions.
   *
   * - `grid.height`: Number of tiles that fit in the vertical axis.
   * - `grid.width`: Number of tiles that fit in the horizontal axis.
   *
   * This method ensures that the grid values are rounded to the nearest whole number.
   */
  _setGrid() {
    this.grid = {
      height: Math.round(this.size[1] / this.tile[1]),
      width: Math.round(this.size[0] / this.tile[0]),
    };
  }

  /**
   * Sets the name of the map and updates the corresponding UI element if available.
   *
   * @param {string} name - The new name of the map.
   *
   * This method updates the `name` property of the map and, if the `mapButton`
   * element exists in `this.html`, it updates its text content to reflect the new name.
   */
  setMapName(name) {
    this.name = name;
    if (this.html.mapButton) this.html.mapButton.text(name);
  }

  /**
   * Sets the size of the map and optionally updates the grid.
   *
   * @param {Array} size - An array containing the new width and height of the map.
   * @param {boolean} [setGrid=true] - A flag indicating whether to update the grid after setting the size.
   *
   * This method updates the `size` property of the map, ensuring the values are converted to numbers
   * and are within the allowed limits. It then calls the `_setGrid` method to adjust the grid based on
   * the new size unless the `setGrid` parameter is set to `false`.
   *
   * The width of the map is limited to the `_limitSize` value to prevent the map from exceeding a maximum size.
   */
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

  /**
   * Sets the tile size of the map and optionally updates the grid.
   *
   * @param {Array} tile - An array containing the new width and height for each tile.
   * @param {boolean} [setGrid=true] - A flag indicating whether to update the grid after setting the tile size.
   *
   * This method updates the `tile` property of the map, ensuring the values are converted to numbers
   * and are within the allowed limits. It then calls the `_setGrid` method to adjust the grid based on
   * the new tile size unless the `setGrid` parameter is set to `false`.
   *
   * The height of each tile is limited to the `_limitSize` value to prevent the tile from exceeding a maximum size.
   */
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

  /**
   * Clears the content of the map's HTML table element.
   *
   * This method empties the HTML table associated with the map by calling the `empty()` method on the
   * `html.table` element. This is typically used to remove any existing content from the map before
   * redrawing or reinitializing it.
   */
  emptyMap() {
    this.html.table.empty();
  }

  /**
   * Creates a table cell (`<td>`) element for the grid with optional coordinates, size, background color, and text.
   *
   * This function generates a table cell (`<td>`) element that can be used as part of the grid layout. The created
   * cell has optional coordinates, a specified height and width, an optional background color, and optional text content.
   *
   * @param {number} [cw=0] - The column width, used to set the cell's coordinates (optional).
   * @param {number} [ch=0] - The row height, used to set the cell's coordinates (optional).
   * @param {string|null} [text=null] - The text content to be displayed inside the cell (optional).
   * @param {string|null} [color=null] - The background color of the cell (optional).
   *
   * @returns {jQuery} - A jQuery object representing the table cell (`<td>`) element.
   */
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

  /**
   * Builds the grid for the map by generating a table structure with cells.
   *
   * This function creates a grid layout by generating HTML table rows (`<tr>`) and cells (`<td>`) dynamically.
   * The grid dimensions are determined based on the `this.grid.height` and `this.grid.width` values.
   * It also utilizes `_buildGridTemplate()` to build individual table cells with optional coordinates and styling.
   *
   * The generated grid will be appended to the `this.html.table` element, and an array of grid elements is stored
   * in `this.html.grid`.
   *
   * @returns {void}
   */
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

  /**
   * Updates the grid content by generating and applying routes and locations to the map grid.
   *
   * This function performs two main tasks:
   * 1. It updates the grid cells with route information, including tooltips, route number, and styling (background color, font color).
   * 2. It updates the grid cells with location information, including tooltips, location names, mini names, and styling.
   * Additionally, it sets up click events on the location cells to trigger modal dialogs with location details and item shops.
   *
   * @returns {void}
   */
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
        coordplace.attr(
          'location_enabled',
          this.location === `Route {number}`.replace(/\{number\}/g, routeNumber) ? 'on' : 'off',
        );

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
        coordplace.attr(
          'location_enabled',
          this.location === this.locations[item2].name ? 'on' : 'off',
        );
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

  /**
   * Updates the size of the map by adjusting the dimensions of the map's table element.
   *
   * This function modifies the `width` and `height` of the `html.table` element based on:
   * - The map's overall size (`this.size[0]` for width, `this.size[1]` for height).
   * - The size of the individual tiles (`this.tile[0]` for tile width, `this.tile[1]` for tile height).
   *
   * @returns {void}
   */
  updateMapSize() {
    this.html.table.css({
      width: this.size[0] + this.tile[0],
      height: this.size[1] + this.tile[1],
    });
  }

  /**
   * Sets the background image for the map and updates the table's background style.
   *
   * This function checks if the provided image URL (`imgUrl`) is a valid data URL (i.e., it starts with `data:`).
   * If it is, it sets the `this.image` property to that URL. The function then updates the background style
   * of `this.html.table` with the new image URL, and adjusts the background size to fit the map size.
   *
   * @param {string} imgUrl - The URL of the image to be set as the map background. It must be a valid string and
   *                          should start with 'data:' for data URLs.
   *
   * @returns {void}
   */
  setMapImage(imgUrl) {
    this.image = typeof imgUrl === 'string' && this.#isValidDataImage(imgUrl) ? imgUrl : '';
    if (this.html.table)
      this.html.table.css({
        background: this.image
          ? 'transparent url("' + this.image + '") no-repeat right bottom'
          : '',
        'background-size': this.image ? this.size[0] + 'px ' + Number(this.size[1] - 2) + 'px' : '',
      });
  }

  /**
   * Builds a new page structure by clearing the existing content and appending new elements.
   *
   * This function modifies `this.html.base` to build a new page layout. It:
   * - Clears any existing content using `.empty()`.
   * - Optionally adds a title, if a `title` string is provided, by creating an `<h3>` element.
   * - Appends a new `<div>` with an optional class name (`className`) and the provided `tinyHtml` content.
   *
   * @param {jQuery} tinyHtml - The HTML content to be appended to the page.
   * @param {string|null} [title=null] - The title for the page, which will be wrapped in an `<h3>` tag. If not provided, no title is added.
   * @param {string|null} [className=null] - The CSS class to be applied to the wrapping `<div>`. If not provided, no class is applied.
   *
   * @returns {void}
   */
  buildPage(tinyHtml, title = null, className = null) {
    this.html.base
      .empty()
      .append(
        typeof title === 'string' ? $('<h3>').text(title) : null,
        $('<div>', { class: className }).append(tinyHtml),
      );
  }

  /**
   * Activates or deactivates the subpage view for the map.
   *
   * When activated, the function updates the page with the content of `this.html.subPage.html` and sets the title
   * to `this.html.subPage.title`. When deactivated, the map view is restored and resized based on the current table
   * dimensions, minus the tile size, with the class `table-responsive` applied.
   *
   * @param {boolean} [active=true] - Whether to activate or deactivate the subpage view.
   *                                  If `true`, the subpage content is shown. If `false`, the map view is restored.
   *
   * @returns {void}
   */
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

  /**
   * Builds or resets the map view.
   *
   * If `resetHtml` is `true`, the HTML elements are recreated from scratch, including the base container,
   * table, and map button. The map grid is rebuilt and the map's size and image are updated accordingly.
   * The subpage view is also deactivated.
   *
   * When `resetHtml` is `false`, the function updates the existing map view without altering the HTML structure.
   * The map button toggles the visibility of the map and subpage content based on the current state of the subpage.
   *
   * @param {boolean} [resetHtml=false] - Whether to reset the HTML structure and start from scratch. If `true`,
   *                                      the HTML elements for the map are recreated.
   *
   * @returns {void}
   */
  buildMap(resetHtml = false) {
    // The map
    const tinyThis = this;
    if (resetHtml) this.html.base = $('<center>', { class: 'd-none' });

    // The table
    if (resetHtml) this.html.table = $('<table>', { class: 'table table-bordered' });
    this.updateMapSize();

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
    this.setMapImage(this.image);
  }

  /**
   * Gets the map button element.
   *
   * @returns {jQuery} The map button element.
   */
  getMapButton() {
    return this.html.mapButton;
  }

  /**
   * Gets the map table HTML element.
   *
   * @returns {jQuery} The table element representing the map.
   */
  getMapHtml() {
    return this.html.table;
  }

  /**
   * Gets the base HTML element for the map container.
   *
   * @returns {jQuery} The base container element for the map.
   */
  getMapBaseHtml() {
    return this.html.base;
  }
}

export default TinyMap;
