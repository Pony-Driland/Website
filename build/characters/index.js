// Get Path
const path = require('path');
const fs = require('fs');
const { glob } = require("glob");
const { writeJsonFile, ensureDirectory } = require('tiny-essentials');

const getDirectories = (src, callback) => glob(src + '/**/*')
    .then((data) => callback(null, data)).catch((err) => callback(err));

// Get Fic Data
const ficData = require('../publicFolder')();

const selectedType = 'none';

// Read Data
const folderPath = path.join(__dirname, './data');
getDirectories(folderPath, (err, files) => {
    if (!err) {

        // Prepare Custom URL
        const customURLs = {};

        const promptsList = [];
        let globalCharsData = `\n\n`;

        // Read Files
        files.forEach(async file => {
            if (!fs.lstatSync(`${file}`).isDirectory()) {

                // File Name
                const f = path.parse(file);

                // Start Group
                console.group(f.base);

                // Get JSON
                const jsonFilePath = path.join(f.dir, './' + f.name + '.json');
                const jsonFile = require(jsonFilePath);
                console.log('JSON File', jsonFilePath);

                // Write prompt files
                if (f.ext.endsWith('.md')) {
                    const fileData = fs.readFileSync(file, 'utf8');
                    if (!fileData) return;

                    globalCharsData += `----- Character "${jsonFile.title}" Data -----\n\n`;
                    globalCharsData += fileData.replace(/\<ai\>|\<\/ai\>/g, '');
                    fs.writeFileSync(path.join(ficData.dist, `./prompts/${f.name}.md`), fileData, 'utf-8');
                    globalCharsData += `\n\n----- The end Character "${jsonFile.title}" Data -----`;
                    promptsList.push(f.name);

                    // End Group
                    console.groupEnd();
                    return;
                }

                const imgUrl = selectedType === 'ipfs' && ficData.config.ipfs.files[jsonFile.image] ? ficData.config.ipfs.host.replace('{cid}', ficData.config.ipfs.files[jsonFile.image]) :
                    selectedType === 'ario' && ficData.config.ario.files[jsonFile.image] ? ficData.config.ario.host.replace('{cid}', ficData.config.ario.files[jsonFile.image]) :
                    jsonFile.image;

                // Create oEmbed File
                if (
                    imgUrl &&
                    jsonFile.author_name &&
                    jsonFile.tags &&
                    jsonFile.title &&
                    jsonFile.description &&
                    jsonFile.color
                ) {
                    console.log('Creating JSON oEmbed...');
                    ensureDirectory(path.join(ficData.dist, './oEmbed'));
                    ensureDirectory(path.join(ficData.dist, './oEmbed/characters'));
                    writeJsonFile(path.join(ficData.dist, './oEmbed/characters/' + f.name + '.json'), {
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
                    }, 2);
                    console.log('Done!');

                    // Create HTML File
                    console.log('Creating HTML...');
                    ensureDirectory(path.join(ficData.dist, './characters'));
                    fs.writeFileSync(path.join(ficData.dist, './characters/' + f.name + '.html'), `
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
        <link rel="preload" href="/bundle.css" as="style">
        <link rel="stylesheet" href="../bundle.css">
        <link rel="stylesheet" href="../css/dark.css">
        <link rel="stylesheet" href="../css/main.css">
        <link rel="manifest" href="../manifest.json">

        <!-- Page Info -->
        <meta content="${jsonFile.title}" property="og:title">
        <meta content="https://${ficData.config.domain}/characters/${f.name}.html" property="og:url">
        <meta property="url" content="https://${ficData.config.domain}/characters/${f.name}.html">
        <meta content="${jsonFile.author_name}" property="dc:creator">
        <meta content="website" property="og:type">
        <meta content="${jsonFile.description}" property="og:description">
        <meta content="${jsonFile.description}" property="description">

        <!-- Embed -->
        <link href="../oEmbed/characters/${f.name}.json" rel="alternate" title="oEmbed JSON Profile" type="application/json+oembed">
        <meta content="${imgUrl}" property="og:image">
        <link href="https://${ficData.config.domain}/characters/${f.name}.html" rel="canonical">
        
        <!-- Theme -->
        <meta name="theme-color" content="${jsonFile.color}">
        <meta name="msapplication-navbutton-color" content="${jsonFile.color}">
        <meta name="apple-mobile-web-app-status-bar-style" content="${jsonFile.color}">

        <!-- Website -->
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="${ficData.config.title}">
        <meta property="og:site" content="${ficData.config.title}">
        <meta http-equiv="refresh" content="0; URL='/?path=%2Fdata%2Fcharacters%2F${f.name}%2FREADME.md&title=${encodeURIComponent(jsonFile.title)}'"/>

        <meta name="twitter:card" content="summary">
        <meta name="twitter:site" content="@${ficData.config.twitter.username}">
        <meta name="twitter:creator" content="@${ficData.config.twitter.username}">
        <meta name="twitter:image" content="${imgUrl}">

        <!-- Script -->
        <script src="../redirect.js"></script>
    
    </head>
    <body><div id="newURL" href="/?path=%2Fdata%2Fcharacters%2F${f.name}%2FREADME.md&title=${encodeURIComponent(jsonFile.title)}"></div></body>

</html>
            `);
                    console.log('Done!');
                }

                // Create Custom URL
                const fileId = f.dir.endsWith('/characters/data') ? f.name :
                    `${path.basename(f.dir)}/${f.name}`;

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

        globalCharsData += `\n\n`;

        // Custom List
        console.log('Creating JS...');
        fs.writeFileSync(path.join(ficData.src, './chapters/characters.mjs'), `
import storyCfg from './config.mjs';

if(!storyCfg.custom_url) { storyCfg.custom_url = {}; }
storyCfg.characters = ${JSON.stringify(customURLs, null, 2)};
for(const item in storyCfg.characters) {
    storyCfg.custom_url[storyCfg.characters[item].path] = {
        url: storyCfg.characters[item].url,
        title: storyCfg.characters[item].title
    };
}
`);
        fs.writeFileSync(path.join(ficData.dist, './prompts/prompts.txt'), globalCharsData, 'utf-8');
        fs.writeFileSync(path.join(ficData.dist, './prompts/prompts.json'), JSON.stringify(promptsList), 'utf-8');
        console.log('Done!');

    } else {
        console.error(err);
    }
});