if (arg === 'debug') {
    buildCfg.minify = false;
    buildCfg.bundle = false;
    buildCfg.splitting = false;
    buildCfg.legalComments = 'none';

    async function traverseAndTranspile(dir, base = '') {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      // Read entries
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(base, entry.name);

        // Directory
        if (entry.isDirectory()) {
          await traverseAndTranspile(fullPath, relativePath);
        }

        // Javascript
        else if (
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.mjs') ||
          entry.name.endsWith('.cjs') ||
          entry.name.endsWith('.ts')
        ) {
          // Create File
          const outPath = path.join(distVendor, relativePath);
          await fs.ensureDir(path.dirname(outPath));

          /** @type {import('esbuild').BuildOptions} */
          const cfg = {
            ...buildCfg,
            entryPoints: [fullPath],
            outfile: outPath,
            metafile: true,
          };

          await build(cfg);
        }
        // Continue
        else {
          await fs.copy(fullPath, path.join(distVendor, relativePath));
        }
      }
    }

    // Execute codes
    await traverseAndTranspile(src);
  }
  // Production
  else {
    buildCfg.minify = true;
    buildCfg.bundle = true;
    buildCfg.splitting = true;
    buildCfg.outdir = distVendor;
    await build(buildCfg);
  }