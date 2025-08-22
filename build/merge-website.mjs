// merge-folders.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDirectory } from 'tiny-essentials';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively deletes a folder if it exists.
 * @param {string} dirPath
 */
async function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
  }
}

/**
 * Recursively copies files from source to destination.
 * If files overlap, the latest copied file will overwrite the previous one.
 * @param {string} src
 * @param {string} dest
 */
async function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  await fs.promises.mkdir(dest, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Merges two folders into a destination folder.
 * @param {string} folderA
 * @param {string} folderB
 * @param {string} destination
 */
async function mergeFolders(folderA, folderB, destination) {
  await cleanDir(destination);

  // Copy order defines overwrite priority (folderB overwrites folderA)
  await copyRecursive(folderA, destination);
  await copyRecursive(folderB, destination);
}

async function main() {
    
  const folderA = path.join(__dirname, '../public');
  const folderB = path.join(__dirname, '../dist/public');
  const destination = path.join(__dirname, '../dist/WEBSITE');
  console.log(folderA);
  ensureDirectory(folderB);
  console.log(folderB);
  ensureDirectory(destination);
  console.log(destination);

  // Clean before starting
  await cleanDir(destination);

  // Merge
  await mergeFolders(folderA, folderB, destination);

  console.log('✨ Merge complete! Files are in dist/WEBSITE');
}

main().catch(err => {
  console.error('❌ Error during merge:', err);
  process.exit(1);
});
