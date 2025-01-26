const ExifReader = require('exifreader');
const path = require('path');
const fs = require('fs');

const folderPath = path.join(__dirname, '../../images/ai-reference');

try {

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error(err);
            return;
        }

        for (const index in files) {
            if (!files[index].endsWith('.txt')) {
                fs.readFile(path.join(folderPath, files[index]), (err, data) => {
                    if (err)
                        throw err;
                    else {
                        try {
                            const metadata = ExifReader.load(Buffer.from(data), { includeUnknown: true });
                            let fileContent = '';
                            for (const item in metadata) {
                                if (fileContent) fileContent += `\n`;
                                fileContent += `${item}: ${JSON.stringify(metadata[item], null, 2)}`;
                            }
                            fs.writeFile(path.join(folderPath, `${path.parse(`./${files[index]}`).name}.txt`), fileContent, (err) => {
                                if (err)
                                    console.error(err);
                            });
                        } catch (err) {
                            console.error(err);
                        }
                    }
                });
            }
        }
    });

} catch (error) {
    console.log('Error: ' + error.message);
}