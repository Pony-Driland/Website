var openChapterMenu = function(params = {}) {

    // Prepare Data
    $('#markdown-read').empty();

    // New Read
    const newRead = function(chapter = 1, page = 1, line = 1) {

        // Prepare Pagination
        const pagination = paginateArray(storyData.data[chapter], page, storyCfg.itemsPerPage);
        console.log(chapter, page, line);
        console.log(pagination);

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

        /* 
            Primeiro escolher qual capitulo o usuário quer ler.
            Depois checar se existe bookmark, se tiver, vamos carregar direto para o checkpoint.
        */

        // Prepare Choose
        $('#markdown-read').append(

            $('<h2>').text(`Please choose a chapter to read.`).prepend(
                $('<i>', { class: 'fas fa-book-open mr-3' })
            )

        );

        // Test
        newRead();

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