// Get Path
const path = require('path');
const fs = require('fs');

// Get Fic Data
const ficData = require('../publicFolder')();
console.log(ficData);

// Read Data
const folderPath = path.join(__dirname, './data');
fs.readdir(folderPath, (err, files) => {
    if (!err) {
        files.forEach(async file => {

            // File Name
            file = path.parse(file);

            // Start Group
            console.group(file.base);

            // Get JSON
            const jsonFile = require(path.join(folderPath, './' + file.name + '.json'));
            console.log(jsonFile);

            console.log(path.join(ficData.path, './oEmbed/characters/' + file.name + '.json'));

            // End Group
            console.groupEnd();

            // Complete
            return;

        });
    } else {
        console.error(err);
    }
});

// Interval
setInterval(function() {}, 100);