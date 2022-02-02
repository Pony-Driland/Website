var storyDialogue = {

    // Action
    action: function(item, items, data) {

        storyData.chapter.html[item] = $('<tr>', { line: item }).append(
            $('<td>', { class: 'py-4 font-weight-bold d-none d-md-table-cell' }).text(item),
            $('<td>', { class: 'py-4' }).text(''),
            $('<td>', { class: 'py-4' }).append(
                $('<strong>').text(data.value)
            )
        );

        items.push(storyData.chapter.html[item]);

    },

    // Dialogue
    dialogue: function(item, items, data) {

        storyData.chapter.html[item] = $('<tr>', { line: item }).append(
            $('<td>', { class: 'py-4 font-weight-bold d-none d-md-table-cell' }).text(item),
            $('<td>', { class: 'py-4', width: '15%' }).text(data.character),
            $('<td>', { class: 'py-4' }).append(
                $('<span>').text(data.value)
            )
        );

        items.push(storyData.chapter.html[item]);

    },

    // Think
    think: function(item, items, data) {

        storyData.chapter.html[item] = $('<tr>', { line: item }).append(
            $('<td>', { class: 'py-4 font-weight-bold d-none d-md-table-cell' }).text(item),
            $('<td>', { class: 'py-4', width: '15%' }).text(data.character),
            $('<td>', { class: 'py-4' }).append(
                $('<small>').text(data.value)
            )
        );

        items.push(storyData.chapter.html[item]);

    }

};

var openChapterMenu = function(params = {}) {

    // Prepare Data
    clearFicData();
    $('#markdown-read').empty();

    // New Read
    const newRead = async function(chapter = 1, page = 1, line = null) {

        // Load Sounds
        if (storyCfg.sfx) {
            console.log(`Loading Audio Data...`);
            $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });

            if (!storyData.sfx) { storyData.sfx = {}; }
            for (const item in storyCfg.sfx) {
                if (!storyData.sfx[item] && typeof storyCfg.sfx[item].type === 'string' && typeof storyCfg.sfx[item].value === 'string') {

                    if (storyCfg.sfx[item].type === 'file' || (storyCfg.sfx[item].type === 'ipfs' && storyCfg.ipfs && typeof storyCfg.ipfs.host === 'string')) {
                        await musicManager.insertSFX(item);
                    }

                }
            }

            $.LoadingOverlay("hide");
            console.log(`Audio Data Loaded!`);
        }

        // Set Selected
        storyData.readFic = true;
        $('#fic-chapter').text(`Chapter ${chapter}`);
        storyData.chapter.selected = chapter;

        // Prepare Data
        $('#markdown-read').empty();
        storyData.chapter.html = {};

        // Detect Bookmark
        if (typeof storyData.chapter.bookmark[storyData.chapter.selected] === 'number' && storyData.chapter.bookmark[storyData.chapter.selected] !== 1) {

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

        // Get Pagination
        const pagination = paginateArray(storyData.data[chapter], page, storyCfg.itemsPerPage);

        // Items
        const items = [];

        // Insert Items
        let lastNumber = 0;
        const numberPag = Number(pagination.perPage * Number(pagination.currentPage - 1));
        for (const item in pagination.data) {
            lastNumber = Number(item) + numberPag + 1;
            if (typeof storyDialogue[pagination.data[item].type] === 'function') {
                storyDialogue[pagination.data[item].type](
                    lastNumber,
                    items,
                    pagination.data[item]
                );
            }
        }

        // Pagination
        let tinyPag = $('<nav>');
        tinyPag.bootstrapPaginator({
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            size: 'normal',
            alignment: 'center'
        });

        let tinyPag2 = $('<nav>');
        tinyPag2.bootstrapPaginator({
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            size: 'normal',
            alignment: 'center'
        });

        tinyPag.on('page-changed', function() {

            // Get Page
            const page = Number($(this).find('.active').text().trim());

            // Prepare Pagination
            const pagination = paginateArray(storyData.data[chapter], page, storyCfg.itemsPerPage);

            // Reset Item
            storyData.chapter.html = {};
            table.empty();

            // Items
            const items = [];

            // Insert Items
            let lastNumber = 0;
            const numberPag = Number(pagination.perPage * Number(pagination.currentPage - 1));
            for (const item in pagination.data) {
                lastNumber = Number(item) + numberPag + 1;
                if (typeof storyDialogue[pagination.data[item].type] === 'function') {
                    storyDialogue[pagination.data[item].type](
                        lastNumber,
                        items,
                        pagination.data[item]
                    );
                }
            }

            // Update Data
            updateChapterCache(numberPag + 1);

            // Insert
            table.append(items);
            tinyLib.goToByScroll($('#app'), 0);
            tinyPag2.bootstrapPaginator("show", page);
            $(window).trigger('scroll');

        });

        tinyPag2.on('page-changed', function() {

            // Get Page
            const page = Number($(this).find('.active').text().trim());
            tinyPag.bootstrapPaginator("show", page);

        });

        // Update Data
        updateChapterCache(numberPag + 1);

        // Items
        const table = $('<tbody>');
        table.append(items);

        // Table
        $('#markdown-read').append(

            // Info
            $('<div>', { class: 'alert alert-info' }).text('Bold texts are action texts, small texts are thoughts of characters, common texts are dialogues.').prepend(
                $('<i>', { class: 'fas fa-info-circle mr-3' })
            ),

            // Title
            $('<h3>').text(`Chapter ${chapter}`).append($('<small>', { class: 'ml-3' }).text(storyCfg.chapterName[chapter].title)),

            // Pagination
            tinyPag,

            // Table
            $('<table>', { class: 'table table-bordered' }).css('background-color', 'rgb(44 44 44)').append(table),

            // Pagination
            tinyPag2,

        );

        // Fic Mode
        $('body').addClass('ficMode');

        // Complete
        $(window).trigger('scroll');
        if (line !== null) { tinyLib.goToByScroll($('#markdown-read [line="' + line + '"]'), 0); }
        return;

    };

    // Exist Chapter
    if (typeof params.chapter === 'string' && params.chapter.length > 0) {

        // Fix Page
        if (params.page) {
            params.page = Number(params.page);
            if (typeof params.page !== 'number' || isNaN(params.page) || !isFinite(params.page) || params.page < 1) {
                params.page = 1;
            }
        }

        // Fix Line
        if (params.line) {
            params.line = Number(params.line);
            if (typeof params.line !== 'number' || isNaN(params.line) || !isFinite(params.line) || params.line < 1) {
                params.line = 1;
            }
        }

        // Send Data
        newRead(Number(params.chapter), params.page, params.line, true);

    }

    // Nope. Choose One
    else {

        // Prepare Choose
        $('#markdown-read').append(

            // Info
            $('<div>', { class: 'alert alert-info' }).text('Every time you read a chapter, it will automatically save where you left off. This checkpoint is saved on your browser, if you want to transfer your checkpoint to other computers, save the URL of your checkpoint that will appear when you open a chapter.').prepend(
                $('<i>', { class: 'fas fa-info-circle mr-3' })
            ),

            $('<div>', { class: 'alert alert-info' }).text('Disclaimer: All songs played on this page are played directly from Youtube. This means that many songs do not belong to me and are being used only to please the reading environment. I recognize that if an artist asks to remove a song, I will replace it with another song. And all the songs that are played are counted as views on the original author\'s youtube channel. The official music page link will also be available in the player info icon.').prepend(
                $('<i>', { class: 'fas fa-info-circle mr-3' })
            ),

            $('<h2>').text(`Please choose a chapter to read.`).prepend(
                $('<i>', { class: 'fas fa-book-open mr-3' })
            ).append(
                $('<button>', { class: 'ml-3 btn btn-info btn-sm' }).text('Choose Optional NSFW Content').click(function() {

                    // Nothing NSFW
                    let existNSFW = false;
                    let nsfwContent = $('<center>', { class: 'm-3 small text-warning' }).text('No NSFW content was detected. It may be that soon some NSFW content will be added.');
                    const nsfwList = [];

                    // Detect Fic NSFW
                    for (const fic in storyData.data) {
                        for (const item in storyData.data[fic]) {
                            if (storyData.data[fic][item].nsfw) {
                                for (const nsfwItem in storyData.data[fic][item].nsfw) {
                                    if (nsfwList.indexOf(storyData.data[fic][item].nsfw[nsfwItem]) < 0) {

                                        // Add Item
                                        const NSFWITEM = storyData.data[fic][item].nsfw[nsfwItem];
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
                                            let nsfwValue = localStorage.getItem('NSFW' + NSFWITEM);
                                            if (
                                                typeof nsfwValue !== 'undefined' && (
                                                    nsfwValue === 'true' || nsfwValue === '1' || nsfwValue === true || nsfwValue === 1 || nsfwValue === 'on'
                                                )
                                            ) {
                                                nsfwValue = true;
                                            } else { nsfwValue = false; }

                                            // Set Button Text
                                            let buttonClass = 'success';
                                            let allowButton = 'Enable';
                                            if (nsfwValue) {
                                                allowButton = 'Disable';
                                                buttonClass = 'danger';
                                            }

                                            nsfwContent.push(
                                                $('<div>', { class: 'col-sm-4' }).append(
                                                    $('<div>', { class: 'card' }).append(
                                                        $('<div>', { class: 'card-body' }).append(
                                                            $('<h5>', { class: 'card-title' }).text(storyCfg.nsfw[NSFWITEM].name),
                                                            $('<p>', { class: 'card-text small' }).text(storyCfg.nsfw[NSFWITEM].description),
                                                            $('<button>', { class: 'btn btn-' + buttonClass }).click(function() {

                                                                // Enable
                                                                if (!nsfwValue) {
                                                                    localStorage.setItem('NSFW' + NSFWITEM, true);
                                                                    nsfwValue = true;
                                                                    $(this).removeClass('btn-success').addClass('btn-danger').text('Disable');
                                                                }

                                                                // Disable
                                                                else {
                                                                    localStorage.setItem('NSFW' + NSFWITEM, false);
                                                                    nsfwValue = false;
                                                                    $(this).removeClass('btn-danger').addClass('btn-success').text('Enable')
                                                                }

                                                            }).text(allowButton)
                                                        )
                                                    )
                                                )
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
                    const nsfwDIV = $('<div>');
                    nsfwDIV.append(nsfwContent);
                    if (existNSFW) {
                        nsfwDIV.addClass('row');
                    }

                    // Modal
                    tinyLib.modal({
                        title: [$('<i>', { class: 'fas fa-eye mr-3' }), 'NSFW Settings'],
                        body: $('<center>').append(
                            $('<p>', { class: 'text-danger' }).text('By activating these settings, you agree that you are responsible for the content you consume and that you are over 18 years old!'),
                            nsfwDIV
                        ),
                        dialog: 'modal-lg'
                    });

                })
            ),

        );

        // Read More Data
        for (let i = 0; i < storyData.chapter.amount; i++) {
            const chapter = String(i + 1);
            $('#markdown-read').append(

                $('<div>', { class: 'card' }).append(
                    $('<div>', { class: 'card-body' }).append(
                        $('<h5>', { class: 'card-title' }).text('Chapter ' + chapter),
                        $('<p>', { class: 'card-text' }).text(storyCfg.chapterName[chapter].title),
                        $('<p>', { class: 'card-text small' }).text(storyCfg.chapterName[chapter].description),
                        $('<a>', { class: 'btn btn-primary', href: `/?path=read-fic&title=Pony%20Driland?chapter=${chapter}`, chapter: chapter }).click(function() {

                            // Start Chapter
                            newRead(Number($(this).attr('chapter')));

                            // Complete
                            return false;

                        }).text('Load')
                    )
                )

            );
        }

    }

    /* 
    
        Se o nome do personagem bater com algum personagem com página, ele vai ser um link para acessar a página.

        Adicionar sistema de música e efeitos sonoros.
        Quando um som desaparece, ele tem que ir saindo de forma suave.

        Usuário pode mexer no volume mestre que controla todos os outros volumes.
        Cada som vai ter um volume base pra ficar ambientado com a página.
    
    */

};