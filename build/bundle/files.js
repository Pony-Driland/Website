import fs from 'node:fs';
import path from 'node:path';

// Modules you want to copy
const modulesToCopy = [
    "@cryptofonts/cryptofont/fonts",
    "@fortawesome/fontawesome-free/webfonts",
    ["jsstore/dist/jsstore.worker.min.js", "jsstore.worker.min.js"]
]; // Replace with the desired modules

// Default reference path for modules (you can change this)
const nodeModulesPath = path.join(__dirname, '../../node_modules');
const destinationPath = path.join(__dirname, '../../docs');

// Recursive function to copy files and directories
function copyRecursive(src, dest) {
    if (fs.existsSync(src)) {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            fs.readdirSync(src).forEach((file) => {
                const sourceFile = path.join(src, file);
                const destinationFile = path.join(dest, file);
                copyRecursive(sourceFile, destinationFile); // Recursively copy directories and files
            });
        } else {
            console.log(`📂 Copying: ${src} -> ${dest}`);
            fs.copyFileSync(src, dest);
        }
    }
}

// Main function that allows you to choose the destination
function copyModules() {
    // Create the destination folder if it doesn't exist
    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, { recursive: true });
    }

    // Copy files from each selected module
    modulesToCopy.forEach((modData) => {
        const mod = typeof modData === 'string' ? [modData] : modData;
        if(Array.isArray(mod)) {
            const sourceDist = path.join(nodeModulesPath, `./${mod[0]}`);
            const destFolder = path.join(destinationPath, `./${typeof mod[1] === 'string' ? mod[1] : path.basename(mod[0])}`);
            copyRecursive(sourceDist, destFolder);
            console.log(`✅ Files from '${mod}' copied to '${destFolder}'`);
        }
    });

    console.log("🎉 Copy completed!");
}

// Example usage: Call `copyModules` and provide the destination folder path
copyModules();