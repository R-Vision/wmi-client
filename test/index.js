'use strict';

if(process.platform === 'win32') {
    var WmiClient = require('../');

    var wmi = new WmiClient();

    wmi.query('SELECT * FROM Win32_Process', function (err, result) {
        if(err === null) {
            console.log('Test success!');
        }
        else {
            console.log('Test failure!');
            console.log(err);
        }
    });
}
