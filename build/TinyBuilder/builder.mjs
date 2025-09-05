// build.mjs

// Import required Node.js modules and utilities
import chokidar from 'chokidar';
import fs from 'fs-extra';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Import esbuild and plugins
import { build, context } from 'esbuild';
import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill';

// Setup __dirname and __filename (not available in ES modules by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert exec into a promise-based function
const exec = promisify(execCallback);

// Capture CLI argument (e.g., "debug")
const arg = process.argv[2];

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
    console.error(error.message);
    process.exit(1);
  }
}

// --------------------------------------------------
// TITLE: Build Configurations
// --------------------------------------------------

// Define source and distribution folders
const src = path.join(__dirname, '../../src');
const distTemp = path.join(__dirname, '../../dist/temp');
const distPublic = path.join(__dirname, '../../dist/public');
const distVendor = path.join(distPublic, 'vendor');

/** @type {import('esbuild').BuildOptions} */
const buildCfg = {
  plugins: [nodeModulesPolyfillPlugin()], // adds Node.js polyfills for browser builds
  entryPoints: [path.join(src, 'start.mjs'), path.join(src, 'redirect.mjs')], // main entry points
  format: 'esm', // output as ES modules
  define: {
    global: 'window', // fix libraries that expect "global" to exist
  },
  platform: 'browser', // target environment is the browser
  sourcemap: arg === 'debug' ? true : false, // enable sourcemaps in debug mode
  minify: true, // minify output
  bundle: true, // bundle dependencies together
  splitting: true, // enable code splitting
  outdir: distVendor, // output directory
};

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
 * Step 2b: Build and bundle CSS using Babel.
 */
export const buildCss = async () => {
  await run('npx babel-node build/bundle/css');
};

/**
 * Step 2c: Copy/install extra JS files and run update scripts.
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
  await buildCss();
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
  await build(buildCfg);
  console.log('✨ Build finished successfully!');
}

/**
 * Setup esbuild in watch mode, so changes are rebuilt automatically.
 * 
 * @param {(event: EventName, path: string, stats?: fs.Stats | undefined) => void} watchCallback
 * @param {import('esbuild').Plugin[]} plugins
 * @returns {import('esbuild').BuildContext}
 */
export async function watchWebsite(watchCallback, plugins) {
  chokidar.watch(src).on('all', (event, path, stats) => {
    const filePath = path.split(src)[1];
    watchCallback(event, filePath.startsWith('/') ? filePath.substring(1) : filePath, stats);
  });
  await firstWebBuild();
  /** @type {import('esbuild').BuildOptions} */
  const tinyCfg = {
    ...buildCfg,
    loader: { '.ts': 'ts' }, // allow TypeScript files
    plugins: [...buildCfg.plugins, ...plugins],
  };

  const ctx = await context(tinyCfg);
  return ctx;
}
