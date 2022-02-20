// Get Path
const path = require('path');
const fs = require('fs');
const { SitemapStream } = require('sitemap');

// Get Fic Data
const ficData = require('../publicFolder')();
const chapterMap = fs.createWriteStream(path.join(ficData.path, './sitemap/chapter.xml'));
const charactersMap = fs.createWriteStream(path.join(ficData.path, './sitemap/characters.xml'));
console.log(ficData);

// Read Data
const folderPath = path.join(ficData.path, './chapters/' + ficData.config.defaultLang);
fs.readdir(folderPath, (err, files) => {
    if (!err) {

        // Data
        const data = { count: 0 };
        const smChapter = new SitemapStream({ hostname: 'https://' + ficData.config.domain + '/' });

        // Read Files
        files.forEach(file => {

            data.count++;
            smChapter.write({ url: '/chapter/' + data.count + '.html', changefreq: 'daily', priority: 0.3 });

        });

        // Complete
        smChapter.pipe(chapterMap);
        smChapter.end();

        const folderPath = path.join(ficData.path, './characters');
        fs.readdir(folderPath, (err, files) => {
            if (!err) {

                // Data
                const data = { count: 0 };
                const smCharacters = new SitemapStream({ hostname: 'https://' + ficData.config.domain + '/' });

                // Read Files
                files.forEach(file => {

                    data.count++;
                    smCharacters.write({ url: '/characters/' + file, changefreq: 'daily', priority: 0.3 });

                });

                // Complete
                smCharacters.pipe(charactersMap);
                smCharacters.end();

            } else {
                console.error(err);
            }
        });

    } else {
        console.error(err);
    }
});

// Interval
setInterval(function() {}, 100);