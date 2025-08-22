module.exports = function() {

    // Get Path
    const path = require('path');
    const fs = require('fs');

    // Read Fic Config
    const publicFolder = path.join(__dirname, '../src');
    eval(fs.readFileSync(path.join(publicFolder, './chapters/config.mjs'), 'utf8').replace(/const storyCfg \=/, 'var storyCfg =').replace('export default storyCfg;', ''));
    return { 
        src: publicFolder, 
        public: path.join(__dirname, '../public'), 
        dist: path.join(__dirname, '../dist/public'), 
        config: storyCfg 
    };

};