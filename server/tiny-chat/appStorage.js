import fs from 'fs';
import path from 'path';

import { startDatabase } from './connection/sql';
import { _setIniConfig } from './connection/values';
import { createAppDirectory, ensureIniFile, getIniBoolean } from '../api/ini';

export default async function startFiles() {
  let canStart = true;
  const appStorage = {};
  try {
    // Start content
    console.log(`[APP] [INFO] Starting folder...`);
    const appDir = createAppDirectory('tiny-chat_data', __dirname);
    console.log(`[APP] [INFO] Folder: ${appDir}`);

    // Start ini file
    const config = {};
    const { newCfg, defaultCfg } = await ensureIniFile(
      path.join(appDir, `./config.ini`),
      path.join(__dirname, `./config.ini`),
    );

    /**
     * Insert Config
     * @param {{ [key: string]: any; }} theCfg
     */
    const loadTinyCfg = (theCfg) => {
      // @ts-ignore
      for (const item in theCfg) config[item] = theCfg[item];
      for (const item in theCfg.limits)
        if (typeof theCfg.limits[item] === 'number' || typeof theCfg.limits[item] === 'string')
          _setIniConfig(item, Number(theCfg.limits[item]));

      _setIniConfig('OPEN_REGISTRATION', getIniBoolean(theCfg.server.registration_open));
      _setIniConfig('LOAD_ALL_HISTORY', getIniBoolean(theCfg.server.load_all_history));

      if (typeof theCfg.proxy.address === 'string')
        _setIniConfig('PROXY_ADDRESS', theCfg.proxy.address);
      if (typeof theCfg.proxy.auth === 'string') _setIniConfig('PROXY_AUTH', theCfg.proxy.auth);

      if (typeof theCfg.genesis.owner_id === 'string')
        _setIniConfig('OWNER_ID', theCfg.genesis.owner_id);
      if (typeof theCfg.genesis.owner_password === 'string')
        _setIniConfig('OWNER_PASSWORD', theCfg.genesis.owner_password);
    };

    loadTinyCfg(defaultCfg);
    if (newCfg) loadTinyCfg(newCfg);

    /**
     * Object with a config of your application.
     * @returns {Record<string, *>} - The config.ini file loaded from your application.
     */
    appStorage.config = config;

    /**
     * String with a directory storage of your application.
     * @returns {string} - The full path of the created or existing directory.
     */
    appStorage.appDir = () => appDir;

    /**
     * Synchronously writes data to a file at a specific path within the app directory.
     * @param {string} pathName - The relative path (from the app directory) where the file will be created or modified.
     * @param {string | Buffer} data - The data to write to the file. Can be a string or a Buffer.
     * @param {object} [options] - Optional settings for file writing, such as encoding or mode.
     */
    appStorage.insertFileSync = (pathName, data, options) =>
      fs.writeFileSync(path.join(appDir, pathName), data, options);

    /**
     * Function to create a directory inside a specific parent folder if it doesn't exist.
     * @param {string} newDirectory - The name of the new directory to be created.
     */
    appStorage.createDir = (newDirectory) => {
      // Check if the parent directory exists
      if (!fs.existsSync(appDir)) {
        console.error(`[ERROR] The parent directory does not exist: ${appDir}`);
        return;
      }

      // Full path of the new directory
      const newDirPath = path.join(appDir, newDirectory);

      // Check if the new directory already exists
      if (!fs.existsSync(newDirPath)) fs.mkdirSync(newDirPath);
    };

    // Start database
    canStart = await startDatabase(appStorage);
  } catch (err) {
    canStart = false;
    console.error(err);
  }

  if (canStart) {
    console.log(`[APP] [INFO] Starting app...`);
    return appStorage;
  }
  return null;
}
