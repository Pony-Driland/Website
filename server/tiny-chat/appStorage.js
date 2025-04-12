import fs from 'fs';
import path from 'path';
import ini from 'ini';

import { startDatabase } from './connection/sql';
import { _setIniConfig } from './connection/values';
import isDebug from './isDebug';

const FOLDER_NAME = 'tiny-chat_data';

// Function to create folder to store files
function createAppDirectory() {
  console.log('[APP] [INFO] Starting data directory creation...');

  const appDirectory = !isDebug()
    ? path.join(path.dirname(process.execPath), FOLDER_NAME) // For production, next to the .exe
    : path.join(__dirname, `../${FOLDER_NAME}`); // For development, inside the project folder

  console.log(`[APP] [INFO] Checking if directory ${appDirectory} exists...`);

  if (!fs.existsSync(appDirectory)) {
    console.log(`[APP] [WARNING] Directory ${appDirectory} not found. Creating...`);
    fs.mkdirSync(appDirectory);
    console.log(`[APP] [SUCCESS] Directory ${appDirectory} successfully created.`);
  } else {
    console.log(`[APP] [INFO] Directory ${appDirectory} already exists.`);
  }

  return appDirectory;
}

// Function to ensure the .ini file exists. If it doesn't, it copies a template file.
async function ensureIniFile(iniFilePath, templateFilePath) {
  try {
    // Check if the INI file exists
    if (!fs.existsSync(iniFilePath)) {
      console.log(`[APP] [INI] File ${iniFilePath} does not exist. Copying template...`);

      // Read the template file
      const templateContent = fs.readFileSync(templateFilePath, 'utf-8');

      // Write the template content to the INI file
      fs.writeFileSync(iniFilePath, templateContent);

      console.log(`[APP] [INI] Template copied to ${iniFilePath}`);
    } else {
      console.log(`[APP] [INI] File ${iniFilePath} already exists.`);
    }

    // Load the INI file using the ini module
    const config = ini.parse(fs.readFileSync(iniFilePath, 'utf-8'));
    const defaultCfg = ini.parse(fs.readFileSync(templateFilePath, 'utf-8'));
    console.log('[APP] [INI] INI file loaded!');

    return { newCfg: config, defaultCfg };
  } catch (err) {
    console.error('[APP] [INI] Error ensuring INI file:');
    console.error(err);
    return null;
  }
}

export default async function startFiles() {
  let canStart = true;
  const appStorage = {};
  try {
    // Start content
    console.log(`[APP] [INFO] Starting folder...`);
    const appDir = createAppDirectory();
    console.log(`[APP] [INFO] Folder: ${appDir}`);

    // Start ini file
    const config = {};
    const { newCfg, defaultCfg } = await ensureIniFile(
      path.join(appDir, `./config.ini`),
      path.join(__dirname, `./config.ini`),
    );

    const getIniBoolean = (value) =>
      (typeof value === 'boolean' && value) ||
      (typeof value === 'string' && (value === 'yes' || value === 'on' || value === 'true'))
        ? true
        : false;

    // Insert Config
    const loadTinyCfg = (theCfg) => {
      for (const item in theCfg) config[item] = theCfg[item];
      for (const item in theCfg.limits)
        if (typeof theCfg.limits[item] === 'number' || typeof theCfg.limits[item] === 'string')
          _setIniConfig(item, Number(theCfg.limits[item]));

      _setIniConfig('OPEN_REGISTRATION', getIniBoolean(theCfg.server.registration_open));
      _setIniConfig('LOAD_ALL_HISTORY', getIniBoolean(theCfg.server.load_all_history));

      if (typeof theCfg.genesis.owner_id === 'string')
        _setIniConfig('OWNER_ID', theCfg.genesis.owner_id);
      if (typeof theCfg.genesis.owner_password === 'string')
        _setIniConfig('OWNER_PASSWORD', theCfg.genesis.owner_password);
    };

    loadTinyCfg(defaultCfg);
    if (newCfg) loadTinyCfg(newCfg);

    /**
     * Object with a config of your application.
     * @returns {Object} - The config.ini file loaded from your application.
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
    await startDatabase(appStorage);
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
