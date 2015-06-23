'use strict';

module.exports = function (str) {
    var u = str.match(/^(?![\x20.]+$)([^\\/"[\]:|<>+=;,?*@]+)$|^(?![\x20.]+$)([^\\/"[\]:|<>+=;,?*@]+)(@+|\\+|\/+)(\S+)$/);

    if (!u) {
        throw new Error('Username parse error');
    }

    if (u.length === 2) {
        return u[1];
    }

    var username = u[4];
    var domain = u[2];

    if (username.search('@') !== -1) {
        username = u[2];
        domain = u[4];
    }

    if (process.platform === 'win32') {
        return domain + '\\' + username;
    } else {
        return domain + '\\\\' + username;
    }
};
