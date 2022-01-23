// Get Path
const path = require('path');
const fs = require('fs');

// Read Fic Config
eval(fs.readFileSync(path.join(__dirname, '../../docs/chapters/config.js'), 'utf8'));
console.log(storyCfg);

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