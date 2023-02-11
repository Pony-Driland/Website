const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../docs')));

const antiCors = require('./antiCors');
antiCors(app);

app.listen(port, () => {
    console.log(`Test app listening on port ${port}`);
});