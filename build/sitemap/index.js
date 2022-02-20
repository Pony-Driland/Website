// Get Path
const path = require('path');
const fs = require('fs');
const { SitemapStream } = require('sitemap');

// Get Fic Data
const ficData = require('../publicFolder')();
const chapterMap = fs.createWriteStream(path.join(ficData.path, './sitemap/chapter.xml'));
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
            smChapter.write({ url: '/chapter.html?v=' + data.count, changefreq: 'daily', priority: 0.3 });

        });

        // Complete
        smChapter.pipe(chapterMap);
        smChapter.end();

    } else {
        console.error(err);
    }
});

// Interval
setInterval(function() {}, 100);