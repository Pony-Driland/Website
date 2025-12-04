import fs from 'fs';
import path from 'path';
import ini from 'ini';

import isDebug from './isDebug';

/**
 * @param {boolean|string} value
 * @returns {boolean}
 */
export const getIniBoolean = (value) =>
  (typeof value === 'boolean' && value) ||
  (typeof value === 'string' && (value === 'yes' || value === 'on' || value === 'true'))
    ? true
    : false;

/**
 * Function to ensure the .ini file exists. If it doesn't, it copies a template file.
 * @param {string} iniFilePath
 * @param {string} templateFilePath
 *
 * @returns {Promise<{ newCfg: { [key: string]: any; }; defaultCfg: { [key: string]: any; }; }>}
 */
export async function ensureIniFile(iniFilePath, templateFilePath) {
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
}

/**
 * Function to create folder to store files.
 *
 * @param {string} FOLDER_NAME
 * @param {string} defaultFolder
 * @returns {string}
 */
export function createAppDirectory(FOLDER_NAME, defaultFolder) {
  console.log('[APP] [INFO] Starting data directory creation...');

  const appDirectory = !isDebug()
    ? path.join(path.dirname(process.execPath), FOLDER_NAME) // For production, next to the .exe
    : path.join(defaultFolder, `../${FOLDER_NAME}`); // For development, inside the project folder

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
