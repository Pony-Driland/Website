import fs from 'fs';
import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Client } from 'pg';
import ini from 'ini';

import { _setIniConfig } from './connection/values';

const FOLDER_NAME = 'tiny-chat_data';

// Function to create folder to store files
function createAppDirectory() {
  console.log('[APP] [INFO] Starting data directory creation...');

  const appDirectory =
    process.env.NODE_ENV === 'production' || process.pkg
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

async function isDbOpen(config, client) {
  try {
    if (config.database.type === 'postgre') await client.query('SELECT 1');
    if (config.database.type === 'sqlite3') await client.get('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

export default async function startFiles() {
  let canStart = true;
  const appStorage = {};
  try {
    // Start content
    console.log(`[APP] Starting folder...`);
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
        if (typeof theCfg.limits[item] === 'number') _setIniConfig(item, theCfg.limits[item]);
      _setIniConfig('OPEN_REGISTRATION', getIniBoolean(theCfg.server.registration_open));
      if (typeof theCfg.server.owner_id === 'string')
        _setIniConfig('OWNER_ID', theCfg.server.owner_id);
    };

    loadTinyCfg(defaultCfg);
    if (newCfg) loadTinyCfg(newCfg);

    /**
     * Object with a config of your application.
     * @returns {Object} - The config.ini file loaded from your application.
     */
    appStorage.config = config;

    // Opening the database
    console.log(`[APP] [${config.database.type}] Starting database...`);
    const db =
      config.database.type === 'sqlite3'
        ? await open({
            filename: path.join(appDir, `./database.db`),
            driver: sqlite3.Database,
          })
        : config.database.type === 'postgre'
          ? new Client({
              user: config.database.user,
              host: config.database.host,
              database: config.database.database,
              password: config.database.password,
              port: config.database.port,
            })
          : null;

    if (!db) return;
    if (config.database.type === 'postgre') await db.connect();

    process.on('SIGINT', async () => {
      if (config.database.type === 'sqlite3') await db.close().catch(() => {});
      if (config.database.type === 'postgre') await db.end().catch(() => {});
    });

    console.log(`[APP] [${config.database.type}] Database connection opened.`);

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

    /**
     * Executes a query to get all rows from a database table.
     * @function
     * @async
     * @param {string} query - The SQL query to execute.
     * @param {Array} [params] - The parameters to bind to the query.
     * @returns {Promise<Array>} A promise that resolves to an array of rows.
     * @throws {Error} Throws an error if the query fails.
     */
    appStorage.getAllData = null;

    if (config.database.type === 'sqlite3')
      appStorage.getAllData = async function (query, params = []) {
        return db.all(query, params);
      };

    if (config.database.type === 'postgre')
      appStorage.getAllData = async function (query, params = []) {
        await db.open(); // Ensure the connection is open
        try {
          const res = await db.query(query, params);
          return res.rows; // Returning rows similar to db.all
        } catch (err) {
          throw err;
        }
      };

    /**
     * Executes a query to get a single row from a database table.
     * @function
     * @async
     * @param {string} query - The SQL query to execute.
     * @param {Array} [params] - The parameters to bind to the query.
     * @returns {Promise<Object>} A promise that resolves to a single row object.
     * @throws {Error} Throws an error if the query fails.
     */
    appStorage.getSingleData = null;

    if (config.database.type === 'sqlite3')
      appStorage.getSingleData = async function (query, params = []) {
        return db.get(query, params);
      };

    if (config.database.type === 'postgre')
      appStorage.getSingleData = async function (query, params = []) {
        await db.open(); // Ensure the connection is open
        try {
          const res = await db.query(query, params);
          return res.rows[0]; // Returning the first row, similar to db.get
        } catch (err) {
          throw err;
        }
      };

    /**
     * Executes an SQL statement to modify the database (e.g., INSERT, UPDATE).
     * @function
     * @async
     * @param {string} query - The SQL query to execute.
     * @param {Array} params - The parameters to bind to the query.
     * @returns {Promise<Object>} A promise that resolves to the result of the query execution.
     * @throws {Error} Throws an error if the query fails.
     */
    appStorage.runQuery = null;

    if (config.database.type === 'sqlite3')
      appStorage.runQuery = async function (query, params) {
        return db.run(query, params);
      };

    if (config.database.type === 'postgre')
      appStorage.runQuery = async function (query, params) {
        await db.open(); // Ensure the connection is open
        try {
          const res = await db.query(query, params);
          return res; // Returns the query result, similar to db.run
        } catch (err) {
          throw err;
        }
      };

    /**
     * A method to check if the database connection is open.
     *
     * This method attempts to run a simple query on the database to determine if the
     * connection is open or closed. It returns `true` if the database is open and
     * `false` if the database is closed.
     *
     * @function
     * @returns {Promise<boolean>} A promise that resolves to `true` if the database is open, `false` otherwise.
     */
    appStorage.isDbOpen = () => isDbOpen(config, db);
  } catch (err) {
    canStart = false;
    console.error(err);
  }

  if (canStart) {
    console.log(`[APP] Starting app...`);
    return appStorage;
  }
  return null;
}
