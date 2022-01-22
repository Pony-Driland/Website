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

            // Space
            $('<hr>', { class: 'my-5' }),

            // Navbar
            $('<nav>', { class: 'navbar navbar-expand-lg navbar-dark bg-dark container mb-4' }).append(

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
                        })

                    )
                )

            ),

            // Content
            $('<div>', { id: 'markdown-read', class: 'container' })
        );

        // Start Readme
        insertMarkdownFile(readme);

        // Complete
        console.log(storyData);
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