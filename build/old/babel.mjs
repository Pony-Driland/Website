import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import traverseModule from '@babel/traverse';
import * as babelParser from '@babel/parser';
import { transformFileAsync } from '@babel/core';
import { glob } from 'glob';

const traverse = traverseModule?.default ?? traverseModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __node_modules = path.join(__dirname, '../../node_modules');

// TITLE: babel

export const packJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

/**
 * Parse a JS/TS file and extract all imports/requires
 * 
 * @param {string} filePath
 * @returns {string[]} Array of module paths
 */
function extractDependencies(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = babelParser.parse(code, {
    sourceType: 'unambiguous',
    plugins: [
      'typescript',
      'importMeta',
      'dynamicImport',
      'classProperties',
      'topLevelAwait',
    ]
  });

  const deps = new Set();

  traverse(ast, {
    ImportDeclaration({ node }) {
      const val = node.source.value;
      if (!val.startsWith('.') && !val.startsWith('/')) {
        deps.add(val);
      }
    },
    CallExpression({ node }) {
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'StringLiteral'
      ) {
        const val = node.arguments[0].value;
        if (!val.startsWith('.') && !val.startsWith('/')) {
          deps.add(val);
        }
      }
    }
  });

  return Array.from(deps);
}

/**
 * Encontrar arquivos dentro de node_modules que você quer transpilar
 * 
 * @param {string} moduleName
 * @param {string} outDir
 * @param {import('@babel/core').TransformOptions} babelOptions
 */
export const insertNodeModule = async (moduleName, outDir, babelOptions) => {
  // Captura todos os arquivos JS possíveis dentro do módulo
  const externalFiles = glob.sync(
    path.join(__node_modules, moduleName, '**/*.{js,mjs,cjs}'),
    { nodir: true }
  );

  for (const file of externalFiles) {
    const relativePath = path.relative(path.join(__node_modules, moduleName), file);

    const outFile = path.join(outDir, 'node_modules', moduleName, relativePath.replace(/\.(mjs|cjs|ts)$/, '.js'));

    // Cria diretórios de saída
    fs.mkdirSync(path.dirname(outFile), { recursive: true });

    // Transpila
    const { code } = await transformFileAsync(file, babelOptions);

    fs.writeFileSync(outFile, code, 'utf-8');
  }
};

/**
 * Função para percorrer diretórios e transpilar arquivos
 * 
 * @param {string} srcDir
 * @param {string} outDir
 * @param {import('@babel/core').TransformOptions} babelOptions
 * @returns {Promise<string[]>}
 */
export async function transpileFolder(srcDir, outDir, babelOptions) {
const dependencies = new Set();
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name.replace(/\.(mjs|cjs|ts)$/, '.js'));

    if (entry.isDirectory()) {
      fs.mkdirSync(outPath, { recursive: true });
      const childDeps = await transpileFolder(srcPath, outPath, babelOptions);
      childDeps.forEach(dep => dependencies.add(dep));
    } else if (
      entry.isFile() &&
      (srcPath.endsWith('.mjs') ||
       srcPath.endsWith('.cjs') ||
       srcPath.endsWith('.js') ||
       srcPath.endsWith('.ts'))
    ) {
      // Extrair dependências
      const fileDeps = extractDependencies(srcPath);
      fileDeps.forEach(dep => dependencies.add(dep));

      // Transpilar arquivo
      const { code } = await transformFileAsync(srcPath, babelOptions);
      fs.writeFileSync(outPath, code, 'utf-8');
    } else {
      // Copiar arquivos que não são JS
      fs.copyFileSync(srcPath, outPath);
    }
  }

  return Array.from(dependencies);
}

/**
 * @type {import('@babel/core').TransformOptions}
 */
export const babelOptions = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { esmodules: false }, // transpila para ES5/compatível
        useBuiltIns: 'entry', // polyfill baseado em imports
        corejs: 3, // versão do core-js
        modules: 'auto', // mantém ou converte imports
      },
    ],
  ],
  retainLines: true,
  comments: true,
  sourceType: 'module'
};