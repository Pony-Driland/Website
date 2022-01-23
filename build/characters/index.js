// Get Path
const path = require('path');
const fs = require('fs');

// Read Data
const folderPath = path.join(__dirname, './data');
fs.readdir(folderPath, (err, files) => {
    if (!err) {
        files.forEach(async file => {

            // Start Group
            console.group(file);

            // Get JSON
            const jsonFile = require(path.join(folderPath, './' + file));
            console.log(jsonFile);

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