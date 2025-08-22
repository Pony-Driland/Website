import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';

// List of CSS files to import and combine
const cssFiles = [
  '@cryptofonts/cryptofont/cryptofont.min.css',
  '@fortawesome/fontawesome-free/css/all.min.css',
  'tippy.js/dist/tippy.css',
  'bootstrap/dist/css/bootstrap.min.css',
  'photoswipe/dist/photoswipe.css',
  'tiny-dices/dist/TinyDices.min.css',
  'tiny-essentials/dist/v1/css/aiMarker.min.css',
];

// Async function to read and concatenate the CSS files
const bundleCSS = async (files, outputFile) => {
  let bundledCSS = '';

  // Iterate over the CSS files to read and concatenate
  for (let file of files) {
    const filePath = path.join(__dirname, `../../node_modules/${file}`);

    try {
      const cssContent = await readFile(filePath, 'utf-8');
      bundledCSS += `\n/* === ${file} === */\n${cssContent}\n`;
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }

  // Write the concatenated CSS to the output file
  try {
    await writeFile(outputFile, bundledCSS);
    console.log(`CSS successfully combined into: ${outputFile}`);
  } catch (error) {
    console.error('Error saving the file:', error);
  }
};

// Path of the output file (where the combined CSS will be saved)
const outputFolder = '../../docs/';
const outputBundle = path.join(__dirname, `${outputFolder}bundle.css`);

const startNow = async () => {
  // Create the target directory if it doesn't exist
  await mkdir(path.join(__dirname, outputFolder), { recursive: true });

  // Run the CSS bundling process
  await bundleCSS(cssFiles, outputBundle);
};

startNow();
