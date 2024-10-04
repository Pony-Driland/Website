/*  Rain made by Aaron Rickle */
const rainConfig = {};
(function () {
  var increment = 0;
  rainConfig.drops = "";
  rainConfig.backDrops = "";
  while (increment < 100) {
    //couple random numbers to use for various randomizations
    //random number between 98 and 1
    var randoHundo = Math.floor(Math.random() * (98 - 1 + 1) + 1);
    //random number between 5 and 2
    var randoFiver = Math.floor(Math.random() * (5 - 2 + 1) + 2);
    //increment
    increment += randoFiver;
    //add in a new raindrop with various randomizations to certain CSS properties
    rainConfig.drops +=
      '<div class="drop" style="left: ' +
      increment +
      "%; bottom: " +
      (randoFiver + randoFiver - 1 + 100) +
      "%; animation-delay: 0." +
      randoHundo +
      "s; animation-duration: 0.5" +
      randoHundo +
      's;"><div class="stem" style="animation-delay: 0.' +
      randoHundo +
      "s; animation-duration: 0.5" +
      randoHundo +
      's;"></div><div class="splat" style="animation-delay: 0.' +
      randoHundo +
      "s; animation-duration: 0.5" +
      randoHundo +
      's;"></div></div>';
    rainConfig.backDrops +=
      '<div class="drop" style="right: ' +
      increment +
      "%; bottom: " +
      (randoFiver + randoFiver - 1 + 100) +
      "%; animation-delay: 0." +
      randoHundo +
      "s; animation-duration: 0.5" +
      randoHundo +
      's;"><div class="stem" style="animation-delay: 0.' +
      randoHundo +
      "s; animation-duration: 0.5" +
      randoHundo +
      's;"></div><div class="splat" style="animation-delay: 0.' +
      randoHundo +
      "s; animation-duration: 0.5" +
      randoHundo +
      's;"></div></div>';
  }

  return;
})();

// Start Rain
var rainMode = {
  start: function () {
    $(".rain").empty();
    $(".rain.front-row").append(rainConfig.drops);
    $(".rain.back-row").append(rainConfig.backDrops);
  },

  on: function () {
    $("body").addClass("raining-sky");
  },

  off: function () {
    $("body").addClass("raining-sky");
  },
};

var storyDialogue = {
  nsfwChecker: function (data) {
    if (Array.isArray(data.nsfw)) {
      let nsfwValue = false;
      for (const item in data.nsfw) {
        nsfwValue = tinyLib.booleanCheck(
          localStorage.getItem("NSFW" + data.nsfw[item]),
        );
        if (nsfwValue) {
          break;
        }
      }

      if (nsfwValue) {
        return typeof data.value === "string" ? data.value : null;
      } else {
        return typeof data.value_alternative === "string"
          ? data.value_alternative
          : null;
      }
    } else {
      return typeof data.value === "string" ? data.value : null;
    }
  },

  // Action
  action: function (item, items, data) {
    const message = storyDialogue.nsfwChecker(data);
    if (message) {
      storyData.chapter.html[item] = $("<tr>", { line: item }).append(
        $("<td>", {
          class:
            "py-4 font-weight-bold d-none d-md-table-cell text-white text-center",
        }).text(item),
        $("<td>", { class: "py-4 text-white text-center" })
          .text("")
          .prepend($("<span>", { class: "badge bg-secondary" }).text("Action")),
        $("<td>", { class: "py-4 text-break text-white" }).append(
          $("<strong>", { class: "text-break" }).text(message),
        ),
      );

      items.push(storyData.chapter.html[item]);
    }
  },

  // Dialogue
  dialogue: function (item, items, data) {
    const message = storyDialogue.nsfwChecker(data);
    if (message) {
      storyData.chapter.html[item] = $("<tr>", { line: item }).append(
        $("<td>", {
          class:
            "py-4 font-weight-bold d-none d-md-table-cell text-white text-center",
        }).text(item),
        $("<td>", { class: "py-4 text-white text-center", width: "15%" })
          .text(data.character)
          .prepend(
            $("<span>", { class: "badge bg-secondary" }).text("Character"),
            $("<br/>"),
          ),
        $("<td>", { class: "py-4 text-break text-white" }).append(
          $("<span>", { class: "text-break" }).text(message),
        ),
      );

      items.push(storyData.chapter.html[item]);
    }
  },

  // Telepathy
  telepathy: function (item, items, data) {
    const message = storyDialogue.nsfwChecker(data);
    if (message) {
      storyData.chapter.html[item] = $("<tr>", { line: item }).append(
        $("<td>", {
          class:
            "py-4 font-weight-bold d-none d-md-table-cell text-white text-center",
        }).text(item),
        $("<td>", { class: "py-4 text-white text-center", width: "15%" })
          .text(data.character)
          .prepend(
            $("<span>", { class: "badge bg-secondary" }).text("telepathy"),
            $("<br/>"),
          ),
        $("<td>", { class: "py-4 text-break text-white" }).append(
          $("<small>", { class: "text-break" }).text(message),
        ),
      );

      items.push(storyData.chapter.html[item]);
    }
  },

  // Think
  think: function (item, items, data) {
    const message = storyDialogue.nsfwChecker(data);
    if (message) {
      storyData.chapter.html[item] = $("<tr>", { line: item }).append(
        $("<td>", {
          class:
            "py-4 font-weight-bold d-none d-md-table-cell text-white text-center",
        }).text(item),
        $("<td>", { class: "py-4 text-white text-center", width: "15%" })
          .text(data.character)
          .prepend(
            $("<span>", { class: "badge bg-secondary" }).text("Thought"),
            $("<br/>"),
          ),
        $("<td>", { class: "py-4 text-break text-white" }).append(
          $("<small>", { class: "text-break" }).text(message),
        ),
      );

      items.push(storyData.chapter.html[item]);
    }
  },
};

var openChapterMenu = function (params = {}) {
  // Prepare Data
  clearFicData();
  $("#markdown-read").empty();

  // New Read
  const newRead = async function (chapter = 1, page = 1, line = null) {
    // Clear Update Warn
    $("#fic-start")
      .text("Read Fic")
      .prepend($("<i>", { class: "fab fa-readme me-2" }));

    // Load Sounds
    if (storyCfg.sfx) {
      console.log(`Loading Audio Data...`);
      $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });

      if (!storyData.sfx) {
        storyData.sfx = {};
      }
      for (const item in storyCfg.sfx) {
        if (
          !storyData.sfx[item] &&
          typeof storyCfg.sfx[item].type === "string" &&
          typeof storyCfg.sfx[item].value === "string"
        ) {
          if (
            storyCfg.sfx[item].type === "file" ||
            (storyCfg.sfx[item].type === "ipfs" &&
              storyCfg.ipfs &&
              typeof storyCfg.ipfs.host === "string")
          ) {
            if (typeof storyCfg.sfx[item].loop !== "boolean") {
              storyCfg.sfx[item].loop = true;
            }
            if (typeof storyCfg.sfx[item].module !== "string") {
              storyCfg.sfx[item].module = "all";
            }
            await musicManager
              .insertSFX(
                item,
                storyCfg.sfx[item].loop,
                storyCfg.sfx[item].module,
              )
              .catch((err) => {
                console.error(err);
                alert(err.message);
              });
          }
        }
      }

      $.LoadingOverlay("hide");
      console.log(`Audio Data Loaded!`);
    }

    // Set Selected
    storyData.readFic = true;
    $("#fic-chapter").text(`Chapter ${chapter}`);
    storyData.chapter.selected = chapter;

    // Prepare Data
    $("#markdown-read").empty();
    storyData.chapter.html = {};

    // Detect Bookmark
    if (
      typeof storyData.chapter.bookmark[storyData.chapter.selected] ===
        "number" &&
      storyData.chapter.bookmark[storyData.chapter.selected] !== 1
    ) {
      // Update Line
      if (line === null) {
        line = storyData.chapter.bookmark[storyData.chapter.selected];
      }

      // Read Data
      page = 1;
      let counter = 0;
      for (let i = 0; i < line; i++) {
        if (storyData.data[chapter][i]) {
          // Counter Update
          counter++;

          // Reset
          if (counter > storyCfg.itemsPerPage) {
            counter = 0;
            page++;
          }
        }
      }
    }

    // Save MD5
    localStorage.setItem(
      "chapter" + chapter + "MD5",
      objHash(storyData.data[chapter]),
    );

    // Get Pagination
    const pagination = paginateArray(
      storyData.data[chapter],
      page,
      storyCfg.itemsPerPage,
    );

    // Items
    const items = [];

    // Insert Items
    let lastNumber = 0;
    const numberPag = Number(
      pagination.perPage * Number(pagination.currentPage - 1),
    );
    for (const item in pagination.data) {
      lastNumber = Number(item) + numberPag + 1;
      if (typeof storyDialogue[pagination.data[item].type] === "function") {
        storyDialogue[pagination.data[item].type](
          lastNumber,
          items,
          pagination.data[item],
        );
      }
    }

    // Pagination
    let tinyPag = $("<nav>");
    tinyPag.bootstrapPaginator({
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      size: "normal",
      alignment: "center",
    });

    let tinyPag2 = $("<nav>");
    tinyPag2.bootstrapPaginator({
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      size: "normal",
      alignment: "center",
    });

    tinyPag.on("page-changed", function () {
      // Get Page
      const page = Number($(this).find(".active").text().trim());

      // Prepare Pagination
      const pagination = paginateArray(
        storyData.data[chapter],
        page,
        storyCfg.itemsPerPage,
      );

      // Reset Item
      storyData.chapter.html = {};
      table.empty();

      // Items
      const items = [];

      // Insert Items
      let lastNumber = 0;
      const numberPag = Number(
        pagination.perPage * Number(pagination.currentPage - 1),
      );
      for (const item in pagination.data) {
        lastNumber = Number(item) + numberPag + 1;
        if (typeof storyDialogue[pagination.data[item].type] === "function") {
          storyDialogue[pagination.data[item].type](
            lastNumber,
            items,
            pagination.data[item],
          );
        }
      }

      // Update Data
      cacheChapterUpdater.data(numberPag + 1);

      // Insert
      table.append(items);
      tinyLib.goToByScroll($("#app"), 0);
      tinyPag2.bootstrapPaginator("show", page);
      $(window).trigger("scroll");
    });

    tinyPag2.on("page-changed", function () {
      // Get Page
      const page = Number($(this).find(".active").text().trim());
      tinyPag.bootstrapPaginator("show", page);
    });

    // Update Data
    cacheChapterUpdater.data(numberPag + 1);

    // Items
    const table = $("<tbody>");
    table.append(items);

    // Table
    $("#markdown-read").append(
      // Info
      $("<div>", { class: "alert alert-info" })
        .text(
          "Bold texts are action texts, small texts are thoughts of characters, common texts are dialogues.",
        )
        .prepend($("<i>", { class: "fas fa-info-circle me-3" })),

      // Title
      $("<h3>")
        .text(`Chapter ${chapter}`)
        .append(
          $("<small>", { class: "ms-3" }).text(
            storyCfg.chapterName[chapter].title,
          ),
        ),

      // Pagination
      tinyPag,

      // Table
      $("<table>", {
        class: "table table-bordered table-striped text-white small",
      })
        .css("background-color", "rgb(44 44 44)")
        .append([
          $("<thead>").append(
            $("<tr>").append(
              $("<th>", { scope: "col" }).text("Line"),
              $("<th>", { scope: "col" }).text("Type"),
              $("<th>", { scope: "col" }).text("Content"),
            ),
          ),
          table,
        ]),

      // Pagination
      tinyPag2,

      // Night Effects
      $("<div>", { id: "bg-sky" }).append(
        $("<div>", { class: "flash" }),
        $("<div>", { class: "rain front-row" }),
        $("<div>", { class: "rain back-row" }),
        $("<div>", { class: "stars" }),
        $("<div>", { class: "twinkling" }),
        $("<div>", { class: "clouds" }),
      ),
    );

    // Fic Mode
    $("body").addClass("ficMode");

    // Complete
    $(window).trigger("scroll");
    if (line !== null) {
      tinyLib.goToByScroll($('#markdown-read [line="' + line + '"]'), 0);
    }
    rainMode.start();
    return;
  };

  // Exist Chapter
  if (typeof params.chapter === "string" && params.chapter.length > 0) {
    // Fix Page
    if (params.page) {
      params.page = Number(params.page);
      if (
        typeof params.page !== "number" ||
        isNaN(params.page) ||
        !isFinite(params.page) ||
        params.page < 1
      ) {
        params.page = 1;
      }
    }

    // Fix Line
    if (params.line) {
      params.line = Number(params.line);
      if (
        typeof params.line !== "number" ||
        isNaN(params.line) ||
        !isFinite(params.line) ||
        params.line < 1
      ) {
        params.line = 1;
      }
    }

    // Send Data
    newRead(Number(params.chapter), params.page, params.line, true);
  }

  // Nope. Choose One
  else {
    // Prepare Choose
    $("#markdown-read").append(
      // Banner
      $("<img>", { class: "img-fluid mb-2", src: "/img/external/banner1.jpg" }),

      // Nav
      $("<nav>", { class: "nav nav-pills nav-fill" }).append(
        // Warnings
        $("<a>", {
          class: "nav-item nav-link",
          href: "#warnings",
          "data-bs-toggle": "collapse",
          role: "button",
          "aria-expanded": false,
          "aria-controls": "warnings",
        }).text("Important Warnings"),

        // Character Statistics
        $("<a>", { class: "nav-item nav-link", href: "javascript:void(0)" })
          .text("Character Statistics")
          .click(function () {
            // Prepare Content
            const newDiv = $("<div>", { class: "row" });
            const content = [];
            for (const item in storyData.characters.data) {
              // Prepare Data
              const charData = storyData.characters.data[item];
              const dataBase = $("<div>", { class: "card-body" }).append(
                $("<h5>", { class: "card-title" }).text(
                  tinyLib.toTitleCase(charData.value),
                ),
                $("<p>", { class: "card-text small" }).text(
                  `Performed ${charData.count} dialogues`,
                ),
              );

              // Chapter Read
              for (const item2 in charData.chapter) {
                dataBase.append(
                  $("<p>", { class: "card-text small" }).text(
                    `${charData.chapter[item2]} dialogues in Chapter ${item2}`,
                  ),
                );
              }

              // Insert Data
              content.push(
                $("<div>", { class: "col-sm-6" }).append(
                  $("<div>", { class: "card" }).append(dataBase),
                ),
              );
            }

            // Modal
            tinyLib.modal({
              title: [
                $("<i>", { class: "fa-solid fa-user me-3" }),
                "Character Statistics",
              ],
              body: $("<span>").append(newDiv.append(content)),
              dialog: "modal-lg",
            });

            // Complete
            return false;
          }),

        // Word Statistics
        $("<a>", { class: "nav-item nav-link", href: "javascript:void(0)" })
          .text("Letter Statistics")
          .click(function () {
            // Prepare Content
            const newDiv = $("<div>", { class: "row" });
            const content = [];

            // Insert Data
            content.push(
              $("<div>", { class: "col-sm-6" }).append(
                $("<div>", { class: "card" }).append(
                  $("<div>", { class: "card-body" }).append(
                    $("<h5>", { class: "card-title" }).text(`Total Letters`),
                    $("<p>", { class: "card-text small" }).text(
                      storyData.lettersCount.total,
                    ),
                  ),
                ),
              ),
            );

            // Insert Chapter Data
            for (const item in storyData.lettersCount) {
              if (item !== "total") {
                // Prepare Data
                const charData = storyData.lettersCount[item];
                const dataBase = $("<div>", { class: "card-body" });

                dataBase.append(
                  $("<h5>", { class: "card-title" }).text(`Chapter ${item}`),
                  $("<p>", { class: "card-text small" }).text(charData),
                );

                // Insert Data
                content.push(
                  $("<div>", { class: "col-sm-6" }).append(
                    $("<div>", { class: "card" }).append(dataBase),
                  ),
                );
              }
            }

            // Modal
            tinyLib.modal({
              title: [
                $("<i>", { class: "fa-solid fa-a me-3" }),
                "Letter Statistics",
              ],
              body: $("<span>").append(newDiv.append(content)),
              dialog: "modal-lg",
            });

            // Complete
            return false;
          }),

        $("<a>", { class: "nav-item nav-link", href: "javascript:void(0)" })
          .text("Word Statistics")
          .click(function () {
            // Prepare Content
            const newDiv = $("<div>", { class: "row" });
            const content = [];

            // Insert Data
            content.push(
              $("<div>", { class: "col-sm-6" }).append(
                $("<div>", { class: "card" }).append(
                  $("<div>", { class: "card-body" }).append(
                    $("<h5>", { class: "card-title" }).text(`Total Words`),
                    $("<p>", { class: "card-text small" }).text(
                      storyData.wordsCount.total,
                    ),
                  ),
                ),
              ),
            );

            // Insert Chapter Data
            for (const item in storyData.wordsCount) {
              if (item !== "total") {
                // Prepare Data
                const charData = storyData.wordsCount[item];
                const dataBase = $("<div>", { class: "card-body" });

                dataBase.append(
                  $("<h5>", { class: "card-title" }).text(`Chapter ${item}`),
                  $("<p>", { class: "card-text small" }).text(charData),
                );

                // Insert Data
                content.push(
                  $("<div>", { class: "col-sm-6" }).append(
                    $("<div>", { class: "card" }).append(dataBase),
                  ),
                );
              }
            }

            // Modal
            tinyLib.modal({
              title: [
                $("<i>", { class: "fa-solid fa-a me-3" }),
                "Word Statistics",
              ],
              body: $("<span>").append(newDiv.append(content)),
              dialog: "modal-lg",
            });

            // Complete
            return false;
          }),
      ),

      // Info
      $("<div>", { class: "collapse", id: "warnings" }).append(
        $("<div>", { class: "alert alert-info" })
          .text(
            "Every time you read a chapter, it will automatically save where you left off. This checkpoint is saved on your browser, if you want to transfer your checkpoint to other computers, save the URL of your checkpoint that will appear when you open a chapter.",
          )
          .prepend($("<i>", { class: "fas fa-info-circle me-3" })),

        $("<div>", { class: "alert alert-info" })
          .text(
            "Disclaimer: All songs played on this page are played directly from Youtube. This means that many songs do not belong to me and are being used only to please the reading environment. I recognize that if an artist asks to remove a song, I will replace it with another song. And all the songs that are played are counted as views on the original author's youtube channel. The official music page link will also be available in the player info icon.",
          )
          .prepend($("<i>", { class: "fas fa-info-circle me-3" })),

        $("<div>", { class: "alert alert-info" })
          .text(
            "Our site does not have access to your access information, but some third-party applications installed on this page can collect your navigation data. YouTube, Google, Cloudflare.",
          )
          .prepend($("<i>", { class: "fas fa-info-circle me-3" })),
      ),

      $("<h2>")
        .text(`Please choose a chapter to read.`)
        .prepend($("<i>", { class: "fas fa-book-open me-3" }))
        .append(
          $("<button>", { class: "ms-3 btn btn-info btn-sm" })
            .text("Choose Optional NSFW Content")
            .click(function () {
              // Nothing NSFW
              let existNSFW = false;
              let nsfwContent = $("<center>", {
                class: "m-3 small text-warning",
              }).text(
                "No NSFW content was detected. It may be that soon some NSFW content will be added.",
              );
              const nsfwList = [];

              // Detect Fic NSFW
              for (const fic in storyData.data) {
                for (const item in storyData.data[fic]) {
                  if (storyData.data[fic][item].nsfw) {
                    for (const nsfwItem in storyData.data[fic][item].nsfw) {
                      if (
                        nsfwList.indexOf(
                          storyData.data[fic][item].nsfw[nsfwItem],
                        ) < 0
                      ) {
                        // Add Item
                        const NSFWITEM =
                          storyData.data[fic][item].nsfw[nsfwItem];
                        nsfwList.push(NSFWITEM);

                        // Convert NSFW Content
                        if (!existNSFW) {
                          nsfwContent = [];
                        }

                        // Exist Now
                        existNSFW = true;

                        // Add NSFW Item
                        if (storyCfg.nsfw[NSFWITEM]) {
                          // Get Value
                          let nsfwValue = tinyLib.booleanCheck(
                            localStorage.getItem("NSFW" + NSFWITEM),
                          );

                          // Set Button Text
                          let buttonClass = "success";
                          let allowButton = "Enable";
                          if (nsfwValue) {
                            allowButton = "Disable";
                            buttonClass = "danger";
                          }

                          nsfwContent.push(
                            $("<div>", { class: "col-sm-4" }).append(
                              $("<div>", { class: "card" }).append(
                                $("<div>", { class: "card-body" }).append(
                                  $("<h5>", { class: "card-title" }).text(
                                    storyCfg.nsfw[NSFWITEM].name,
                                  ),
                                  $("<p>", { class: "card-text small" }).text(
                                    storyCfg.nsfw[NSFWITEM].description,
                                  ),
                                  $("<button>", {
                                    class: "btn btn-" + buttonClass,
                                  })
                                    .click(function () {
                                      // Enable
                                      if (!nsfwValue) {
                                        localStorage.setItem(
                                          "NSFW" + NSFWITEM,
                                          true,
                                        );
                                        nsfwValue = true;
                                        $(this)
                                          .removeClass("btn-success")
                                          .addClass("btn-danger")
                                          .text("Disable");
                                      }

                                      // Disable
                                      else {
                                        localStorage.setItem(
                                          "NSFW" + NSFWITEM,
                                          false,
                                        );
                                        nsfwValue = false;
                                        $(this)
                                          .removeClass("btn-danger")
                                          .addClass("btn-success")
                                          .text("Enable");
                                      }
                                    })
                                    .text(allowButton),
                                ),
                              ),
                            ),
                          );
                        }

                        // Unknown
                        else {
                        }
                      }
                    }
                  }
                }
              }

              // NSFW Item
              const nsfwDIV = $("<div>");
              nsfwDIV.append(nsfwContent);
              if (existNSFW) {
                nsfwDIV.addClass("row");
              }

              // Modal
              tinyLib.modal({
                title: [
                  $("<i>", { class: "fas fa-eye me-3" }),
                  "NSFW Settings",
                ],
                body: $("<center>").append(
                  $("<p>", { class: "text-danger" }).text(
                    "By activating these settings, you agree that you are responsible for the content you consume and that you are over 18 years old!",
                  ),
                  nsfwDIV,
                ),
                dialog: "modal-lg",
              });
            }),

          $("<button>", { class: "ms-3 btn btn-info btn-sm" })
            .text("Save As all chapters")
            .click(function () {
              saveRoleplayFormat();
            }),
        ),
    );

    // Read More Data
    for (let i = 0; i < storyData.chapter.amount; i++) {
      // Chapter Number
      const chapter = String(i + 1);
      let isNewValue = "";
      if (storyData.isNew[chapter] === 2) {
        isNewValue = $("<span>", { class: "badge badge-primary ms-3" }).text(
          "NEW",
        );
      } else if (storyData.isNew[chapter] === 1) {
        isNewValue = $("<span>", { class: "badge badge-secondary ms-3" }).text(
          "UPDATE",
        );
      }

      // Add Chapter
      $("#markdown-read").append(
        $("<div>", { class: "card" }).append(
          $("<div>", { class: "card-body" }).append(
            $("<h5>", { class: "card-title" })
              .text("Chapter " + chapter)
              .append(isNewValue),
            $("<p>", { class: "card-text" }).text(
              storyCfg.chapterName[chapter].title,
            ),
            $("<span>", { class: "card-text small me-1" }).text(
              `${storyData.data[chapter].length} Lines`,
            ),
            $("<span>", { class: "card-text small me-2" }).text(
              `${Math.ceil(storyData.data[chapter].length / storyCfg.itemsPerPage)} Pages`,
            ),
            $("<span>", { class: "card-text small ms-1" }).text(
              `${storyData.lettersCount[chapter]} Letters`,
            ),
            $("<span>", { class: "card-text small ms-1" }).text(
              `${storyData.wordsCount[chapter]} Words`,
            ),
            $("<p>", { class: "card-text small" }).text(
              storyCfg.chapterName[chapter].description,
            ),
            $("<a>", {
              class: "btn btn-primary m-2 ms-0",
              href: `/chapter/${chapter}.html`,
              chapter: chapter,
            })
              .click(function () {
                // Start Chapter
                newRead(Number($(this).attr("chapter")));

                // Complete
                return false;
              })
              .text("Load"),
            $("<a>", {
              class: "btn btn-primary m-2 me-0",
              href: `/chapter/${chapter}.html`,
              chapter: chapter,
            })
              .click(function () {
                // Save Chapter
                saveRoleplayFormat(Number($(this).attr("chapter")));

                // Complete
                return false;
              })
              .text("Save as"),
          ),
        ),
      );
    }
  }

  /* 

        Se o nome do personagem bater com algum personagem com página, ele vai ser um link para acessar a página.
        If the character's name matches a character with a page, it will be a link to access the page.

    */
};
