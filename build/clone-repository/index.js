// Module
const copydir = require('copy-dir');
const path = require('path');

// Folders Path
const websitePath = path.join(__dirname, '../../docs');
const destPath = path.join(__dirname, '../../../Pony-Driland-Keybase');

// Action
console.log(`Copy Dir "${websitePath}" ==> "${destPath}"`);
copydir(websitePath, destPath, {
    utimes: true, // keep add time and modify time
    mode: true, // keep file mode
    cover: true // cover file when exists, default is true
}, function(err) {

    // Success
    if (!err) {

        // Complete
        console.log('Copy Complete!');

    }

    // Error
    else { console.error(err); }

});