// build.mjs

// Import required Node.js modules and utilities
import fs from 'fs-extra';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Import esbuild and plugins
import { sassPlugin } from 'esbuild-sass-plugin';
import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill';
import TinyBuilder from './TinyBuilder.mjs';

// Setup __dirname and __filename (not available in ES modules by default)
// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert exec into a promise-based function
const exec = promisify(execCallback);

// Capture CLI argument (e.g., "debug")
const arg = process.argv[2];

// --------------------------------------------------
// TITLE: Build Configurations
// --------------------------------------------------

// Define source and distribution folders
const distTemp = path.join(__dirname, '../../dist/temp');
const distPublic = path.join(__dirname, '../../dist/public');

export const tiny = new TinyBuilder({
  plugins: [
    nodeModulesPolyfillPlugin(),
    sassPlugin({
      type: 'css', // gera arquivo CSS separado
    }),
  ], // adds Node.js polyfills for browser builds
  entryPoints: ['start.mjs', 'redirect.mjs'], // main entry points
  format: 'esm', // output as ES modules
  define: {
    global: 'window', // fix libraries that expect "global" to exist
  },
  platform: 'browser', // target environment is the browser
  sourcemap: arg === 'debug' ? true : false, // enable sourcemaps in debug mode
  minify: true, // minify output
  bundle: true, // bundle dependencies together
  splitting: true, // enable code splitting
  outdir: path.join(distPublic, 'vendor'), // output directory
  loader: {
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.svg': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
  },
});

tiny.src = path.join(__dirname, '../../src');

// --------------------------------------------------
// TITLE: Directory Management
// --------------------------------------------------

/**
 * Deletes a directory if it exists and recreates it as an empty folder.
 * This ensures a clean state before building.
 * @param {string} dirPath - Directory path to reset
 */
async function resetDir(dirPath) {
  if (fs.existsSync(dirPath)) await fs.promises.rm(dirPath, { recursive: true, force: true });
  await fs.promises.mkdir(dirPath, { recursive: true });
}

// --------------------------------------------------
// TITLE: Run Shell Command
// --------------------------------------------------

/**
 * Runs a shell command and prints its live output to the console.
 * If the command fails, the script stops.
 * @param {string} command - Shell command to run
 */
async function run(command) {
  console.log(`▶ Running: ${command}`);
  try {
    const { stdout, stderr } = await exec(command);
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (error) {
    console.error(`❌ Error in command: ${command}`);
    // @ts-ignore
    console.error(error.message);
    process.exit(1);
  }
}

// --------------------------------------------------
// TITLE: Build Steps
// --------------------------------------------------

/**
 * Step 1: Clean and prepare dist folders before building.
 */
export const prepareFolders = async () => {
  console.log('🧹 Cleaning dist/public...');
  await resetDir(distPublic);
  console.log('🧹 Cleaning dist/temp...');
  await resetDir(distTemp);
  fs.mkdirSync(distTemp, { recursive: true }); // ensure dist/temp exists
};

/**
 * Step 2a: Run Prettier on source code for formatting.
 */
export const prettierSrc = async () => {
  await run('prettier --write ./src/*');
};

/**
 * Step 2b: Copy/install extra JS files and run update scripts.
 */
export const installMoreJsFiles = async () => {
  await run('npx babel-node build/bundle/files');
  await run('npm run update-chapter');
  await run('npm run update-characters');
  await run('npm run update-sitemap');
};

/**
 * Step 3: Execute the full pre-build sequence (folders + CSS + JS files + Prettier).
 */
export const firstWebBuild = async () => {
  await prepareFolders();
  await installMoreJsFiles();
  await prettierSrc();
};

// --------------------------------------------------
// TITLE: Main Build and Watch
// --------------------------------------------------

/**
 * Run a full website build (clean, preprocess, and then esbuild).
 */
export async function buildWebsite() {
  await firstWebBuild();
  await tiny.build();
  console.log('✨ Build finished successfully!');
}

/**
 * Setup esbuild in watch mode, so changes are rebuilt automatically.
 */
export async function watchWebsite() {
  await tiny.start(firstWebBuild);
}
