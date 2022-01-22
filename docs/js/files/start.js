// Start Load
var appData = { youtube: {} };

// Start Document
console.groupCollapsed('App Information');
console.log(`Name: ${storyCfg.title}`);
console.log(`Description: ${storyCfg.description}`);
console.log(`Author: ${storyCfg.creator}`);
console.log(`Author Page: ${storyCfg.creator_url}`);
console.log(`Age Rating: ${storyCfg.ageRating}`);
console.log(`Github Repository: https://github.com/${storyCfg.github.account}/${storyCfg.github.repository}`);
console.log(`Tags`, storyCfg.tags);
console.log(`NSFW`, true);
console.groupEnd();

// URL Update
var urlUpdate = function(url, title = 'Pony Driland') {

    document.title = title;

    if (typeof url === 'string' && url.length > 0) {
        window.history.pushState({ "pageTitle": title }, "", '/?path=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title));
    } else {
        window.history.pushState({ "pageTitle": title }, "", '/');
    }

};

// Insert Maarkdown File
var insertMarkdownFile = function(text) {

    // Prepare Convert Base
    const convertBase = `https\\:\\/\\/github.com\\/${storyCfg.github.account}\\/${storyCfg.github.repository}\\/blob\\/main\\/`;

    // Convert Data
    const data = marked.parse(text)
        .replace(new RegExp(`href\=\"${convertBase}docs\\/`, 'g'), 'href="javascript:void(0)" file="/')
        .replace(new RegExp(`src\=\"${convertBase}docs\\/`, 'g'), 'src="/');

    // Insert Data
    $('#markdown-read').empty().html(data);

    // Convert File URLs
    $('[id="markdown-read"] a[file]').removeAttr('target').click(function() {
        openMDFIle($(this).attr('file'));
        urlUpdate($(this).attr('file'), $(this).text().trim());
    });

};

var openMDFIle = function(url) {

    // Read Data Base
    console.log(`Opening MD file "${url}"...`);
    $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });

    $.ajax({
        url: url,
        type: 'get',
        dataType: 'text'
    }).done(function(fileData) {
        console.log(`MD File opened successfully!`);
        insertMarkdownFile(fileData);
        tinyLib.goToByScroll($('#md-navbar'));
        $.LoadingOverlay("hide");
    }).fail(err => {
        $.LoadingOverlay("hide");
        console.error(err);
        alert(err.message);
    });

};

// Start App
$(function() {
    console.log('Starting App...');
    storyData.start(function(fn, readme) {

        // Insert CID
        $('#info-base').append(
            $('<br/>'),
            $('<small>').text('CID: ' + storyData.cid),
            $('<br/>'),
            $('<small>').append(
                $('<span>').text('CID32: '),
                $('<a>', { href: `https://${storyData.cid32}.ipfs.dweb.link/` }).text(storyData.cid32)
            )
        );

        // Insert Readme
        $('#app').append(

            // Navbar
            $('<nav>', { class: 'navbar navbar-expand-lg navbar-dark bg-dark container mb-4', id: 'md-navbar' }).append(

                // Title
                $('<a>', { class: 'navbar-brand' }).text('Menu'),

                // Button
                $('<button>', { class: 'navbar-toggler', type: 'button', 'data-toggle': 'collapse', 'data-target': '#mdMenu', 'aria-controls': '#mdMenu', 'aria-expanded': false }).append(
                    $('<span>', { 'class': 'navbar-toggler-icon' })
                ),

                // Collapse
                $('<div>', { class: 'collapse navbar-collapse', id: 'mdMenu' }).append(
                    $('<div>', { class: 'navbar-nav' }).append(

                        // Homepage
                        $('<a>', { class: 'nav-item nav-link', href: 'javascript:void(0)' }).text('Homepage').click(function() {
                            openMDFIle('/README.md');
                            urlUpdate();
                        })

                    )
                )

            ),

            // Content
            $('<div>', { id: 'markdown-read', class: 'container' })
        );

        // Start Readme
        if (!params || typeof params.path !== 'string' || params.path.length < 1 || !params.path.startsWith('/')) {
            insertMarkdownFile(readme);
        } else {
            openMDFIle(params.path);
            if (typeof params.title !== 'string' || params.title.length < 1) {
                urlUpdate(params.path, params.title);
            } else {
                urlUpdate(params.path);
            }
        }

        // Complete
        console.log(storyData);
        $('#under-development').modal();
        fn();

    });
});

/* 

    Music
    storyData.youtube.play('vwsRv0Rqncw')
    storyData.youtube.player.playVideo()
    storyData.youtube.player.pauseVideo()
    storyData.youtube.player.stopVideo()

    storyData.youtube.player.mute()
    storyData.youtube.player.unMute()
    storyData.youtube.player.isMuted()

    storyData.youtube.player.setVolume(100)

    player.getDuration()
    player.getVideoUrl()

    appData.youtube.onPlaying = function() {
        console.log(storyData.youtube.currentTime);
    };

*/