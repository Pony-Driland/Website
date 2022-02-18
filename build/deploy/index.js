/* 

  <script src="https://cdn.jsdelivr.net/npm/ipfs/dist/index.min.js"></script>
  const nodeId = 'ipfs-' + Math.random()
  const status = node.isOnline() ? 'online' : 'offline'
  const node = await Ipfs.create({ repo: nodeId })
  const results = await node.add('=^.^= meow meow')
  const cid = results[0].hash
  console.log('CID created via ipfs.add:', cid)
  const data = await node.cat(cid)
  console.log('Data read back via ipfs.cat:', new TextDecoder().decode(data))

*/

// Module
const { exec } = require("child_process");
const copydir = require('copy-dir');
const path = require('path');

// Folders Path
const keybaseFolder = 'Pony-Driland-Keybase';
const rootPath = path.join(__dirname, '../..');
const websitePath = path.join(rootPath, './docs');
const destPath = path.join(__dirname, '../../../' + keybaseFolder);

// Action
console.log(`Copy Dir "${websitePath}" ==> "${destPath}"`);
copydir(websitePath, destPath, {
    utimes: true, // keep add time and modify time
    mode: true, // keep file mode
    cover: true // cover file when exists, default is true
}, function(err) {

    // Success
    if (!err) {

        // Complete
        console.log('Copy Complete!');
        console.log('starting child 1');

        // Git Push
        const exec1 = exec("git add -A | git push -u origin --all", { cwd: rootPath });

        exec1.stdout.on('data', function(data) {
            console.log('stdout: ' + data.toString());
        });

        exec1.stderr.on('data', function(data) {
            console.log('stderr: ' + data.toString());
        });

        exec1.on('exit', function(code) {

            // Complete
            console.log('child 1 process exited with code ' + code.toString());
            console.log('starting child 2');

            // Git Push 2
            const exec2 = exec("git add -A | git push -u origin --all", { cwd: destPath });

            exec2.stdout.on('data', function(data) {
                console.log('stdout: ' + data.toString());
            });

            exec2.stderr.on('data', function(data) {
                console.log('stderr: ' + data.toString());
            });

            exec2.on('exit', function(code) {

                // Complete
                console.log('child 2 process exited with code ' + code.toString());
                console.log('Complete!');

            });

        });

    }

    // Error
    else { console.error(err); }

});