import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import TinyWebEssentials from 'tiny-server-essentials';

import { tiny, watchWebsite } from './builder.mjs';

// Force environment to development mode
process.env.NODE_ENV = 'development';

// Setup __dirname and __filename (since not available in ES modules)
// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize TinyWebEssentials Express wrapper
const http = new TinyWebEssentials.Express();
http.init(); // prepares internal middleware and routing
const port = 3000;
tiny.port = port + 1;

// The development build must never be served from the browser cache. Otherwise a
// module (or a chapter JSON) keeps its previous version until a hard reload,
// which makes the whole build look broken.
http.root.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve static files from dist/public (your build output)
http.root.use(express.static(path.join(__dirname, '../../dist/public')));

// Enable "freeMode", which serves raw files from /public (non-bundled assets)
http.freeMode(path.join(__dirname, '../../public'));

(async () => {
  // Start esbuild in watch mode (rebuilds automatically on file changes)
  await watchWebsite();
  await tiny.ctx?.watch(); // begin watching for changes
  // Start HTTP server
  http.getServer().listen(port, () => {
    console.log(`Test app listening on port ${port}`);
  });
})();
