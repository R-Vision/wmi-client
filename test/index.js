'use strict';

if(process.platform === 'win32') {
    var WmiClient = require('../');
    var wmi = new WmiClient();

    wmi.query('SELECT * FROM Win32_Process', function (err, result) {
        if(err === null && result.length > 0) {
            console.log('Test "SELECT *" success!');
        } else {
            console.log('Test "SELECT *" failure!');
            console.log(err);
        }
    });

    wmi.query('SELECT Name FROM Win32_Process', function (err, result) {
        if(err === null && result.length > 0) {
            console.log('Test "SELECT Name" success!');
        } else {
            console.log('Test "SELECT Name" failure!');
            console.log(err);
        }
    });
} else {
    console.log('Tests can only be run on Windows.');
}
