'use strict';

var WmiClient = require('../');

var wmi = new WmiClient({
    username: null,
    password: null,
    host: '127.0.0.1'
});

wmi.query('SELECT * FROM Win32_Process', function (err, result) {
    console.log(err || result);
});
