const express = require('express');
const path = require('path');
const TinyWebEssentials = require('tiny-server-essentials');
process.env.NODE_ENV = 'development'

const http = new TinyWebEssentials.Express();
http.init();
const port = 3000;

http.root.use(express.static(path.join(__dirname, '../dist/public')));
http.freeMode(path.join(__dirname, '../public'));

http.getServer().listen(port, () => {
    console.log(`Test app listening on port ${port}`);
});