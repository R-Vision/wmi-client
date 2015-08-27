var fs = require('fs');
var path = require('path');

if (process.platform === 'linux') {
    fs.chmodSync(path.join(__dirname, '..', 'bin', 'wmic_centos_x64'), 777);
    fs.chmodSync(path.join(__dirname, '..', 'bin', 'wmic_ubuntu_x64'), 777);
}
