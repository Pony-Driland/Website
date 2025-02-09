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
            if (!files[index].endsWith('.txt') && !files[index].endsWith('.md')) {
                const pathFile = path.join(folderPath, files[index]);
                fs.stat(pathFile, (err, stats) => {
                    if (err) {
                        console.error(err);
                        console.log(pathFile);
                    } else if (!stats.isDirectory()) {
                        fs.readFile(pathFile, (err, data) => {
                            if (err) {
                                console.error(err);
                                console.log(pathFile);
                            }
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
                                    console.log(pathFile);
                                    console.error(err);
                                }
                            }
                        });
                    }
                });
            }
        }
    });
} catch (error) {
    console.log('Error: ' + error.message);
}