// Get Path
const path = require('path');
const fs = require('fs');

// Get Fic Data
const ficData = require('../publicFolder')();
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
        });

        // Create JS File
        console.log('Creating JS...');
        fs.writeFileSync(path.join(ficData.path, './chapters/counter.js'), `storyCfg.chapters = ${String(data.count)};`);
        console.log('Done!');

    } else {
        console.error(err);
    }
});

// Interval
setInterval(function() {}, 100);