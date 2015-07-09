'use strict';

module.exports = function (str) {
    if (!str || str === '') {
        return null;
    }

    var u = str.match(/^(?![\x20.]+$)([^\\/"[\]:|<>+=;,?*@]+)$|^(?![\x20.]+$)([^\\/"[\]:|<>+=;,?*@]+)(@+|\\+|\/+)(\S+)$/);

    if (!u) {
        throw new Error('Username parse error');
    }

    // username without password
    if (u[1]) {
        return u[1];
    }

    var username = u[4];
    var domain = u[2];

    if (str.search('@') !== -1) {
        username = u[2];
        domain = u[4];
    }

    return domain + '\\' + username;
};
