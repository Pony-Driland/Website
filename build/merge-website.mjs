// merge-folders.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDirectory } from 'tiny-essentials/fileManager/normal';
import { createAudioFilter, resolveAudioFilterOptions } from './audio-filter.mjs';

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
 * @param {{ shouldSkip?: (filePath: string) => boolean }} [filter]
 */
async function copyRecursive(src, dest, filter) {
  if (!fs.existsSync(src)) return;

  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  await fs.promises.mkdir(dest, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath, filter);
    } else {
      // The audio filter only affects the build output, never the source folder.
      if (filter?.shouldSkip?.(srcPath)) continue;
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Merges two folders into a destination folder.
 * @param {string} folderA
 * @param {string} folderB
 * @param {string} destination
 * @param {{ shouldSkip?: (filePath: string) => boolean }} [filter]
 */
async function mergeFolders(folderA, folderB, destination, filter) {
  await cleanDir(destination);

  // Copy order defines overwrite priority (folderB overwrites folderA)
  await copyRecursive(folderA, destination, filter);
  await copyRecursive(folderB, destination, filter);
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

  // Heavy audio files (ex: .wav) are only removed from the final website.
  const audioFilter = createAudioFilter({
    root: path.join(__dirname, '..'),
    ...resolveAudioFilterOptions(),
  });

  // Clean before starting
  await cleanDir(destination);

  // Merge
  await mergeFolders(folderA, folderB, destination, audioFilter);

  // The metadata must stop listing the heavy formats that were not copied.
  const patched = audioFilter.finalize(destination, folderA);
  if (patched.length > 0) {
    console.log(`🔊 Audio filter: ${patched.length} data.json file(s) updated.`);
  }

  audioFilter.logSummary();

  console.log('✨ Merge complete! Files are in dist/WEBSITE');
}

main().catch(err => {
  console.error('❌ Error during merge:', err);
  process.exit(1);
});
