# Build Folder

Inside this folder are stored scripts for building website files. This makes updating the website much faster and easier to perform.

Each folder can contain instructions on how to work. For more details you can find in the ".vscode" folder.

Don't forget to give credits if you want to use my fanfic website building system.

<hr/>

## Folders and files that can be modified

/build/characters/data

/docs/chapters/en (Or whatever language you have set.)

/docs/chapters/config.js

/docs/img

/docs/404.html

/docs/ipfs-404.html

/docs/manifest.json

/docs/README.md

## Browserify Example

browserify build/modules/marked.js -o docs/js/marked.js
browserify build/modules/index.js -p esmify > docs/js/bundle.js
