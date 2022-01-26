var storyDialogue = {

    // Action
    action: function(items, data) {

        items.push(
            $('<tr>').append(
                $('<td>', { class: 'py-4' }).text(''),
                $('<td>', { class: 'py-4' }).append(
                    $('<strong>').text(data.value)
                )
            )
        );

    },

    // Dialogue
    dialogue: function(items, data) {

        items.push(
            $('<tr>').append(
                $('<td>', { class: 'py-4', width: '20%' }).text(data.character),
                $('<td>', { class: 'py-4' }).append(
                    $('<span>').text(data.value)
                )
            )
        );

    },

    // Think
    think: function(items, data) {

        items.push(
            $('<tr>').append(
                $('<td>', { class: 'py-4', width: '20%' }).text(data.character),
                $('<td>', { class: 'py-4' }).append(
                    $('<small>').text(data.value)
                )
            )
        );

    },

    set: {

    }

};

var openChapterMenu = function(params = {}) {

    // Prepare Data
    $('#markdown-read').empty();

    // New Read
    const newRead = function(chapter = 1, page = 1, line = 1) {

        // Set Selected
        storyData.chapter.selected = chapter;

        // Prepare Data
        $('#markdown-read').empty();

        // Prepare Pagination
        const pagination = paginateArray(storyData.data[chapter], page, storyCfg.itemsPerPage);
        console.log(chapter, page, line);
        console.log(pagination);

        // Items
        const items = [];

        // Insert Items
        for (const item in pagination.data) {
            if (typeof storyDialogue[pagination.data[item].type] === 'function') {
                storyDialogue[pagination.data[item].type](items, pagination.data[item]);
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

        tinyPag.on('page-changed', function(event) {
            console.log(event);
        });

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
            $('<table>', { class: 'table' }).append(
                $('<tbody>').append(items)
            )

        );

        /* 
            Depois checar se existe bookmark, se tiver, vamos carregar direto para o checkpoint.
        */

    };

    // Exist Chapter
    if (typeof params.chapter === 'string' && params.chapter.length > 0) {

        // Fix Page
        if (params.page) {
            params.page = Number(params.page);
            if (typeof params.page !== 'number' || isNaN(params.page) || !isFinite(params.page) || params.page < 1) {
                params.page = 1;
            }
        } else { params.page = 1; }

        // Fix Line
        if (params.line) {
            params.line = Number(params.line);
            if (typeof params.line !== 'number' || isNaN(params.line) || !isFinite(params.line) || params.line < 1) {
                params.line = 1;
            }
        } else { params.line = 1; }

        // Send Data
        newRead(params.chapter, params.page, params.line, true);

    }

    // Nope. Choose One
    else {

        // Prepare Choose
        $('#markdown-read').append(

            $('<h2>').text(`Please choose a chapter to read.`).prepend(
                $('<i>', { class: 'fas fa-book-open mr-3' })
            )

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
                            newRead($(this).attr('chapter'));

                            // Complete
                            return false;

                        }).text('Load')
                    )
                )

            );
        }

    }

    /* 
    

        Botão de voltar para o menu.
        Botão de navegar entre páginas.
        
        Usuário escolher se quer ver determinados tipos de cenas explicitas.
        Se o nome do personagem bater com algum personagem com página, ele vai ser um link para acessar a página.

        Adicionar sistema de música e efeitos sonoros.
        Quando um som desaparece, ele tem que ir saindo de forma suave.

        Usuário pode mexer no volume mestre que controla todos os outros volumes.
        Cada som vai ter um volume base pra ficar ambientado com a página.
    
    */

};