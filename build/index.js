const path = require('path');
const TinyWebEssentials = require('tiny-server-essentials');
process.env.NODE_ENV = 'development'

const http = new TinyWebEssentials.Express();
http.init();
const port = 3000;

http.freeMode(path.join(__dirname, '../docs'));

http.getServer().listen(port, () => {
    console.log(`Test app listening on port ${port}`);
});