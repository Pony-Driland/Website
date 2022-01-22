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
var urlUpdate = function(url, title, isPopState = false) {

    // Page Title
    if (typeof title !== 'string' || title.length < 1) { title = storyCfg.title; }
    document.title = title;

    // Pop State
    if (!isPopState) {
        if (typeof url === 'string' && url.length > 0) {
            window.history.pushState({ "pageTitle": title }, "", '/?path=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title));
        } else {
            window.history.pushState({ "pageTitle": title }, "", '/');
        }
    }

};

var openNewAddress = function(data, isPopState = false) {

    if (!data || typeof data.path !== 'string' || data.path.length < 1 || !data.path.startsWith('/') || data.path.indexOf('http://') > -1 || data.path.indexOf('https://') > -1) {
        insertMarkdownFile(storyData.readme);
    } else {
        openMDFIle(data.path);
        if (typeof data.title === 'string' && data.title.length > 0) {
            urlUpdate(data.path, data.title, isPopState);
        } else {
            urlUpdate(data.path, null, isPopState);
        }
    }

};

$(window).on('popstate', function() {
    const urlSearchParams = new URLSearchParams(document.location.search);
    openNewAddress(Object.fromEntries(urlSearchParams.entries()), true);
});

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

// Open MD FIle
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
        tinyLib.goToByScrollTop(0);
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

        // Readme
        storyData.readme = readme;

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

        // Insert Navbar
        $('body').prepend(

            // Navbar
            $('<nav>', { class: 'navbar navbar-expand-lg navbar-dark bg-dark fixed-top', id: 'md-navbar' }).append(

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

            )

        );

        // Insert Readme
        $('#app').append(

            // Content
            $('<div>', { id: 'markdown-read', class: 'container' })
        );

        // Start Readme
        openNewAddress(params, true);

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