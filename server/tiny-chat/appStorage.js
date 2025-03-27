import fs from 'fs';
import path from 'path';

const FOLDER_NAME = 'ponydriland_tiny_chat';

// Function to create folder to store files
function createAppDirectory() {
  console.log('[APP] [INFO] Starting data directory creation...');

  const appDirectory =
    process.env.NODE_ENV === 'production'
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

export default async function startFiles() {
  // Start content
  console.log(`[APP] Starting folder...`);
  const appDir = createAppDirectory();

  const appStorage = {
    /**
     * String with a directory storage of your application.
     * @returns {string} - The full path of the created or existing directory.
     */
    appDir: () => appDir,

    /**
     * Synchronously writes data to a file at a specific path within the app directory.
     * @param {string} pathName - The relative path (from the app directory) where the file will be created or modified.
     * @param {string | Buffer} data - The data to write to the file. Can be a string or a Buffer.
     * @param {object} [options] - Optional settings for file writing, such as encoding or mode.
     */
    insertFileSync: (pathName, data, options) =>
      fs.writeFileSync(path.join(appDir, pathName), data, options),

    /**
     * Function to create a directory inside a specific parent folder if it doesn't exist.
     * @param {string} newDirectory - The name of the new directory to be created.
     */
    createDir: (newDirectory) => {
      // Check if the parent directory exists
      if (!fs.existsSync(appDir)) {
        console.error(`[ERROR] The parent directory does not exist: ${appDir}`);
        return;
      }

      // Full path of the new directory
      const newDirPath = path.join(appDir, newDirectory);

      // Check if the new directory already exists
      if (!fs.existsSync(newDirPath)) fs.mkdirSync(newDirPath);
    },
  };

  console.log(`[APP] Starting app...`);
  return appStorage;
}
