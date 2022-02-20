// Get Path
const path = require('path');
const fs = require('fs');
const { SitemapStream } = require('sitemap');

// Get Fic Data
const fileName = 'sitemap.xml';
const ficData = require('../publicFolder')();
const smStream = new SitemapStream({ hostname: 'https://' + ficData.domain + '/' });
console.log(ficData);

// Read Data
const folderPath = path.join(ficData.path, './chapters/' + ficData.config.defaultLang);
fs.readdir(folderPath, (err, files) => {
    if (!err) {

        // Data
        const data = { count: 0 };

        // Read Files
        files.forEach(file => {

            data.count++;
            smStream.write({ url: '/chapter.html?v=' + data.count, changefreq: 'daily', priority: 0.3 });

        });

        smStream.end();
        console.log(smStream);

    } else {
        console.error(err);
    }
});

// Interval
setInterval(function() {}, 100);