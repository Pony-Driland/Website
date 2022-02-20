// Get Path
const path = require('path');
const fs = require('fs');

// Get Fic Data
const ficData = require('../publicFolder')();
console.log(ficData);


// Read Index
fs.readFile(path.join(ficData.path, './index.html'), 'utf8', function(err, data) {

    // Error
    if (err) { return console.error(err); }

    // Fix Data
    data.replace(/\<script async src\=\"https\:\/\/www\.googletagmanager\.com\/gtag\/js\?id\=(.*)\"\>\<\/script\>/, function(item, item2) {
        console.log(item2);
        return item;
    });


});

// Interval
setInterval(function() {}, 100);