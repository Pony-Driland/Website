module.exports = function() {

    // Get Path
    const path = require('path');
    const fs = require('fs');

    // Read Fic Config
    const publicFolder = path.join(__dirname, '../docs');
    eval(fs.readFileSync(path.join(publicFolder, './chapters/config.js'), 'utf8'));
    return { path: publicFolder, config: storyCfg };

};