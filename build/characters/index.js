// Get Path
const path = require('path');
const fs = require('fs');
const { glob } = require("glob");

const getDirectories = (src, callback) => glob(src + '/**/*')
    .then((data) => callback(null, data)).catch((err) => callback(err));

// Get Fic Data
const ficData = require('../publicFolder')();
console.log(ficData);

const selectedType = 'none';

// Read Data
const folderPath = path.join(__dirname, './data');
getDirectories(folderPath, (err, files) => {
    if (!err) {

        // Prepare Custom URL
        const customURLs = {};

        // Read Files
        files.forEach(async file => {
            if (!fs.lstatSync(`${file}`).isDirectory()) {

                // File Name
                file = path.parse(file);

                // Start Group
                console.group(file.base);

                // Get JSON
                const jsonFile = require(path.join(file.dir, './' + file.name + '.json'));
                console.log('JSON File', jsonFile);

                const imgUrl = selectedType === 'cid' && jsonFile['cid-image'] ? ficData.config.ipfs.host.replace('{cid}', jsonFile['cid-image']) :
                selectedType === 'ario' && jsonFile['ario-image'] ? `https://ar-io.dev/${jsonFile['ario-image']}` :
                    jsonFile.image;

                // Create oEmbed File
                if (
                    imgUrl &&
                    jsonFile.author_name &&
                    jsonFile.type &&
                    jsonFile.tags &&
                    jsonFile.title &&
                    jsonFile.description &&
                    jsonFile.color
                ) {
                    console.log('Creating JSON oEmbed...');
                    fs.writeFileSync(path.join(ficData.path, './oEmbed/characters/' + file.name + '.json'), JSON.stringify({
                        author_name: jsonFile.author_name,
                        url: imgUrl,
                        cache_age: 7200,
                        tags: jsonFile.tags,
                        provider_name: ficData.config.title,
                        provider_url: 'https://' + ficData.config.domain,
                        title: jsonFile.title,
                        description: jsonFile.description,
                        type: 'photo',
                        version: '1.0'
                    }, null, 2));
                    console.log('Done!');

                    // Create HTML File
                    console.log('Creating HTML...');
                    fs.writeFileSync(path.join(ficData.path, './characters/' + file.name + '.html'), `
<!doctype html>
<html lang="en">
    <head>
        
        <!-- Config -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8 X-Content-Type-Options=nosniff">
        <meta http-equiv="Content-Script-Type" content="text/javascript">
        
        <!-- Title -->
        <title>${jsonFile.title}</title>
        <link href="../img/icon/icon.png" rel="icon" type="image/x-icon"/>
        
        <!-- CSS -->
        <link rel="preload" href="/css/bootstrap.min.css" as="style">
        <link rel="stylesheet" href="../css/bootstrap.min.css">
        <link rel="stylesheet" href="../css/dark.css">
        <link rel="stylesheet" href="../css/main.css">
        <link rel="manifest" href="../manifest.json">

        <!-- Page Info -->
        <meta content="${jsonFile.title}" property="og:title">
        <meta content="https://${ficData.config.domain}/characters/${file.name}.html" property="og:url">
        <meta property="url" content="https://${ficData.config.domain}/characters/${file.name}.html">
        <meta content="${jsonFile.author_name}" property="dc:creator">
        <meta content="website" property="og:type">
        <meta content="${jsonFile.description}" property="og:description">
        <meta content="${jsonFile.description}" property="description">

        <!-- Embed -->
        <link href="../oEmbed/characters/${file.name}.json" rel="alternate" title="oEmbed JSON Profile" type="application/json+oembed">
        <meta content="${imgUrl}" property="og:image">
        <link href="https://${ficData.config.domain}/characters/${file.name}.html" rel="canonical">
        
        <!-- Theme -->
        <meta name="theme-color" content="${jsonFile.color}">
        <meta name="msapplication-navbutton-color" content="${jsonFile.color}">
        <meta name="apple-mobile-web-app-status-bar-style" content="${jsonFile.color}">

        <!-- Website -->
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="${ficData.config.title}">
        <meta property="og:site" content="${ficData.config.title}">
        <meta http-equiv="refresh" content="0; URL='https://${ficData.config.domain}/?path=%2Fdata%2Fcharacters%2F${file.name}%2FREADME.md&title=${encodeURIComponent(jsonFile.title)}'"/>

        <meta name="twitter:card" content="summary">
        <meta name="twitter:site" content="@${ficData.config.twitter.username}">
        <meta name="twitter:creator" content="@${ficData.config.twitter.username}">
        <meta name="twitter:image" content="${imgUrl}">

        <!-- Script -->
        <script src="../js/jquery.min.js"></script>
        <script src="../js/loadingoverlay.min.js"></script>
        <script src="../js/files/redirect.js"></script>
    
    </head>
    <body><div id="newURL" href="/?path=%2Fdata%2Fcharacters%2F${file.name}%2FREADME.md&title=${encodeURIComponent(jsonFile.title)}"></div></body>

</html>
            `);
                    console.log('Done!');
                }

                // Create Custom URL
                const fileId = file.dir.endsWith('/characters/data') ? file.name :
                    `${path.basename(file.dir)}/${file.name}`;

                customURLs[fileId] = {};

                if (!jsonFile.isNpc) {
                    customURLs[fileId].path = '/data/characters/' + fileId + '/README.md';
                    customURLs[fileId].url = '/characters/' + fileId + '.html';
                }

                customURLs[fileId].title = jsonFile.title;
                customURLs[fileId].description = jsonFile.description;

                // End Group
                console.groupEnd();

            }
        });

        // Custom List
        console.log('Creating JS...');
        fs.writeFileSync(path.join(ficData.path, './chapters/characters.js'), `
if(!storyCfg.custom_url) { storyCfg.custom_url = {}; }
storyCfg.characters = ${JSON.stringify(customURLs, null, 2)};
for(const item in storyCfg.characters) {
    storyCfg.custom_url[storyCfg.characters[item].path] = {
        url: storyCfg.characters[item].url,
        title: storyCfg.characters[item].title
    };
}
`);
        console.log('Done!');

    } else {
        console.error(err);
    }
});

// Interval
setInterval(function () { }, 100);