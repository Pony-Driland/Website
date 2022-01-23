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

        // File Name
        file = path.parse(file);

    } else {
        console.error(err);
    }
});

// Interval
setInterval(function() {}, 100);