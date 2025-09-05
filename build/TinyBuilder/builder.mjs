// build.mjs
import fs from 'fs-extra';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

import { build, context } from 'esbuild';
import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exec = promisify(execCallback);
const arg = process.argv[2];

// TITLE: Directory
/**
 * Deletes a directory and recreates it clean.
 * @param {string} dirPath
 */
async function resetDir(dirPath) {
  if (fs.existsSync(dirPath)) await fs.promises.rm(dirPath, { recursive: true, force: true });
  await fs.promises.mkdir(dirPath, { recursive: true });
}

// TITLE: Run Command
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

// TITLE: Config
const src = path.join(__dirname, '../../src');
const distTemp = path.join(__dirname, '../../dist/temp');
const distPublic = path.join(__dirname, '../../dist/public');
const distVendor = path.join(distPublic, 'vendor');

/** @type {import('esbuild').BuildOptions} */
const buildCfg = {
  plugins: [nodeModulesPolyfillPlugin()],
  entryPoints: [path.join(src, 'start.mjs'), path.join(src, 'redirect.mjs')],
  format: 'esm',
  define: {
    global: 'window', // corrige libs que esperam "global"
  },
  platform: 'browser',
  sourcemap: arg === 'debug' ? true : false,
  minify: true,
  bundle: true,
  splitting: true,
  outdir: distVendor,
};

// Step 1: Reset dist/public
export const prepareFolders = async () => {
  console.log('🧹 Cleaning dist/public...');
  await resetDir(distPublic);
  console.log('🧹 Cleaning dist/temp...');
  await resetDir(distTemp);
  fs.mkdirSync(distTemp, { recursive: true });
};

// Step 2: Run commands in sequence
export const prettierSrc = async () => {
  await run('prettier --write ./src/*');
};

export const buildCss = async () => {
  await run('npx babel-node build/bundle/css');
};

export const installMoreJsFiles = async () => {
  await run('npx babel-node build/bundle/files');
  await run('npm run update-chapter');
  await run('npm run update-characters');
  await run('npm run update-sitemap');
};

// Step 3: Run the builder
export const firstWebBuild = async () => {
  await prepareFolders();
  await buildCss();
  await installMoreJsFiles();
  await prettierSrc();
};

export async function buildWebsite() {
  await firstWebBuild();
  await build(buildCfg);
  console.log('✨ Build finished successfully!');
}

/** @returns {import('esbuild').BuildContext} */
export async function watchWebsite() {
  await firstWebBuild();
  const ctx = await context({
    ...buildCfg,
    loader: { '.ts': 'ts' },
  });
  return ctx;
}
