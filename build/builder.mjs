// build.mjs
import fs from 'fs';
import path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exec = promisify(execCallback);
const arg = process.argv[2];

/**
 * Deletes a directory and recreates it clean.
 * @param {string} dirPath
 */
async function resetDir(dirPath) {
  if (fs.existsSync(dirPath))
    await fs.promises.rm(dirPath, { recursive: true, force: true });
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Runs a shell command with live output.
 * @param {string} command
 */
async function run(command) {
  console.log(`▶ Running: ${command}`);
  try {
    const { stdout, stderr } = await exec(command);
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (error) {
    console.error(`❌ Error in command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  const distPublic = path.join(__dirname, '../dist/public');
  const uglifyjs = `${arg !== 'debug' ? `uglifyjs -c -m ` : ''}>`;

  // Step 1: Reset dist/public
  console.log('🧹 Cleaning dist/public...');
  await resetDir(distPublic);

  // Step 2: Run commands in sequence
  await run(`browserify src/start.mjs -p esmify --ignore fs --ignore fs/promises ${uglifyjs} dist/public/bundle.js`);
  await run(`browserify src/redirect.mjs -p esmify --ignore fs --ignore fs/promises ${uglifyjs} dist/public/redirect.js`);
  await run('npx babel-node build/bundle/css');
  await run('npx babel-node build/bundle/files');
  await run('npm run update-chapter');
  await run('npm run update-characters');
  await run('npm run update-sitemap');
  await run('prettier --write ./src/*');

  console.log('✨ Build finished successfully!');
}

main();
