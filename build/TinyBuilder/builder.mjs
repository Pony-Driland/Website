// build.mjs

// Import required Node.js modules and utilities
import fs from 'fs-extra';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Import esbuild and plugins
import { sassPlugin } from 'esbuild-sass-plugin';
import TinyBuilder from './TinyBuilder.mjs';

// Setup __dirname and __filename (not available in ES modules by default)
// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert exec into a promise-based function
const exec = promisify(execCallback);

// Capture CLI argument (e.g., "debug")
const arg = process.argv[2];

/**
 * `true` when the current build is a development one.
 *
 * `npm start` and `npm run build:files:debug` pass `debug` as the first
 * argument.
 *
 * @type {boolean}
 */
const isDev = arg === 'debug';

// --------------------------------------------------
// TITLE: Build Configurations
// --------------------------------------------------

// Define source and distribution folders
const distTemp = path.join(__dirname, '../../dist/temp');
const distPublic = path.join(__dirname, '../../dist/public');

export const tiny = new TinyBuilder({
  plugins: [
    sassPlugin({
      type: 'css', // gera arquivo CSS separado
    }),
  ], // adds Node.js polyfills for browser builds
  // Main entry points. The object form keeps the output name stable when the
  // source file lives inside a subfolder of `src`.
  entryPoints: [
    'start.mjs',
    'redirect.mjs',
    { in: 'pwa/service-worker.mjs', out: 'service-worker' },
  ],
  format: 'esm', // output as ES modules
  define: {
    global: 'window', // fix libraries that expect "global" to exist
  },
  platform: 'browser', // target environment is the browser
  sourcemap: isDev, // enable sourcemaps in debug mode
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
 * @param {{ fatal?: boolean }} [options] - `fatal: false` resolves instead of exiting.
 * @returns {Promise<boolean>} `true` when the command succeeded.
 */
async function run(command, options = {}) {
  const { fatal = true } = options;
  console.log(`▶ Running: ${command}`);
  try {
    const { stdout, stderr } = await exec(command);
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    return true;
  } catch (error) {
    console.error(`❌ Error in command: ${command}`);
    // @ts-ignore
    console.error(error.message);
    if (fatal) process.exit(1);
    return false;
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
 *
 * Prettier exits with an error when one of the glob results is an empty folder
 * (`No supported files were found in the directory`). Formatting is a developer
 * convenience, so a failure here must not abort the build: the previous version
 * of this step killed the whole build (and the watcher) whenever `src/` had an
 * empty folder.
 */
export const prettierSrc = async () => {
  const ok = await run('prettier --write "./src/**/*.{mjs,js,ts,json,css,scss,html,md}"', {
    fatal: false,
  });
  if (!ok) console.warn('⚠️  Prettier failed, keeping the files untouched.');
};

/**
 * Step 2b: Copy/install extra JS files and run update scripts.
 */
export const installMoreJsFiles = async () => {
  await run('node -r @babel/register build/bundle/files');
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
