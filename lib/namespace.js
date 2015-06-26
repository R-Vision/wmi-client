'use strict';

module.exports = function (namespace) {
    var ns = namespace.match(/(\w+)/g);

    if (process.platform === 'win32') {
        ns = '\\\\' + ns.join('\\');
    } else {
        ns = ns.join('\\');
    }

    return ns;
};
