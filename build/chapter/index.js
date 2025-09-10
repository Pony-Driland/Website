// Get Path
const path = require('path');
const fs = require('fs');
const { writeJsonFile, ensureDirectory } = require('tiny-essentials');

// Get Fic Data
const ficData = require('../publicFolder')();

// Read Data
const folderPath = path.join(ficData.public, './chapters/' + ficData.config.defaultLang);
fs.readdir(folderPath, (err, files) => {
    if (!err) {

        // Data
        const data = { count: 0 };

        // Read Files
        files.forEach(file => {

            // Count
            data.count++;

            // File Name
            file = path.parse(file);

            // Start Group
            console.group(file.base);

            // Create oEmbed File
            console.log('Creating JSON oEmbed...');
            ensureDirectory(path.join(ficData.dist, './oEmbed'));
            ensureDirectory(path.join(ficData.dist, './oEmbed/chapter'));
            writeJsonFile(path.join(ficData.dist, './oEmbed/chapter/' + data.count + '.json'), {
                author_name: ficData.config.creator,
                cache_age: 7200,
                tags: ficData.config.chapterName[data.count].tags,
                provider_name: ficData.config.title,
                provider_url: 'https://' + ficData.config.domain,
                title: `Chapter ${data.count} - ${ficData.config.chapterName[data.count].title}`,
                description: ficData.config.chapterName[data.count].description,
                type: 'url',
                version: '1.0'
            }, 2);
            console.log('Done!');

            // Create HTML File
            console.log('Creating HTML...');
            ensureDirectory(path.join(ficData.dist, './chapter'));
            fs.writeFileSync(path.join(ficData.dist, './chapter/' + data.count + '.html'), `
<!doctype html>
<html lang="en">
    <head>
        
        <!-- Config -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8 X-Content-Type-Options=nosniff">
        <meta http-equiv="Content-Script-Type" content="text/javascript">
        
        <!-- Title -->
        <title>Chapter ${data.count} - ${ficData.config.chapterName[data.count].title}</title>
        <link href="../img/icon/icon.png" rel="icon" type="image/x-icon"/>
        
        <!-- CSS -->
        <link rel="preload" href="/bundle.css" as="style">
        <link rel="stylesheet" href="../bundle.css">
        <link rel="stylesheet" href="../css/dark.css">
        <link rel="stylesheet" href="../css/main.css">
        <link rel="manifest" href="../manifest.json">

        <!-- Page Info -->
        <meta content="Chapter ${data.count} - ${ficData.config.chapterName[data.count].title}" property="og:title">
        <meta content="https://${ficData.config.domain}/chapter/${data.count}.html" property="og:url">
        <meta property="url" content="https://${ficData.config.domain}/chapter/${data.count}.html">
        <meta content="${ficData.config.creator}" property="dc:creator">
        <meta content="website" property="og:type">
        <meta content="${ficData.config.chapterName[data.count].description}" property="og:description">
        <meta content="${ficData.config.chapterName[data.count].description}" property="description">
        <meta name="twitter:card" content="summary">
        <meta name="twitter:site" content="@${ficData.config.twitter.username}">
        <meta name="twitter:creator" content="@${ficData.config.twitter.username}">

        <!-- Embed -->
        <link href="../oEmbed/chapter/${data.count}.json" rel="alternate" title="oEmbed JSON Profile" type="application/json+oembed">
        <link href="https://${ficData.config.domain}/chapter/${data.count}.html" rel="canonical">
        
        <!-- Theme -->
        <meta name="theme-color" content="${ficData.config.chapterName[data.count].color}">
        <meta name="msapplication-navbutton-color" content="${ficData.config.chapterName[data.count].color}">
        <meta name="apple-mobile-web-app-status-bar-style" content="${ficData.config.chapterName[data.count].color}">

        <!-- Website -->
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="${ficData.config.title}">
        <meta property="og:site" content="${ficData.config.title}">
        <meta property="twitter:site" content="${ficData.config.title}">
        <meta http-equiv="refresh" content="0; URL='/?path=read-fic&chapter=${data.count}'"/>

        <!-- Script -->
        <script src="../redirect.js"></script>
    
    </head>
    <body><div id="newURL" href="/?path=read-fic&chapter=${data.count}"></div></body>

</html>
            `);
            console.log('Done!');

            // End Group
            console.groupEnd();

            // Complete
            return;

        });

        // Create JS File
        console.log('Creating JS...');
        fs.writeFileSync(path.join(ficData.src, './chapters/counter.mjs'), `import storyCfg from './config.mjs';\n\nstoryCfg.chapters = ${String(data.count)};`);
        console.log('Done!');

    } else {
        console.error(err);
    }
});