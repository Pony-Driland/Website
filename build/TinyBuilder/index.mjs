import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import TinyWebEssentials from 'tiny-server-essentials';

import { watchWebsite } from './builder.mjs';

process.env.NODE_ENV = 'development';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const http = new TinyWebEssentials.Express();
http.init();
const port = 3000;

http.root.use(express.static(path.join(__dirname, '../dist/public')));
http.freeMode(path.join(__dirname, '../public'));

(async () => {
  const ctx = await watchWebsite();
  await ctx.watch();
  console.log(ctx)
  http.getServer().listen(port, () => {
    console.log(`Test app listening on port ${port}`);
  });
})();
