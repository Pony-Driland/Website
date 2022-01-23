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

            // Create oEmbed File
            fs.writeFileSync(path.join(ficData.path, './oEmbed/characters/' + file.name + '.json'), JSON.stringify({
                author_name: jsonFile.author_name,
                url: '/oEmbed/characters/' + file.name + '.' + jsonFile.image,
                cache_age: 7200,
                tags: jsonFile.tags,
                provider_name: ficData.config.title,
                provider_url: 'https://' + ficData.config.domain,
                title: jsonFile.title,
                description: jsonFile.description,
                type: 'photo',
                version: '1.0'
            }, null, 2));

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