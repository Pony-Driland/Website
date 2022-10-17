// Module
const fs = require('fs');
const path = require('path');
const folder = path.join(__dirname, './');

// Read Data
fs.readdirSync(folder).forEach(file => {
    if(file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.webp') || file.endsWith('.webm')) {

        // Prepare File
        const filePath = path.join(folder, `./${file}`);
        console.log(`Loading file ${filePath}`);

        // Get Content
        const content = fs.readFileSync(filePath, { encoding: 'base64' });
        fs.writeFileSync(path.join(folder, `./${path.parse(filePath).name}.txt`), content);

    }
});

// Complete
console.log('Tiny Complete! :3');