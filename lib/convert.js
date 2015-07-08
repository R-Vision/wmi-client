'use strict';

var intRegexp = /^(\-|\+)?([1-9]+[0-9]*)$/;
var floatRegexp = /^(\-|\+)?([0-9]+(\.[0-9]+)?([eE][0-9]+)?|Infinity)$/;

module.exports = function (v) {
    if (v.toLowerCase() === 'null' || v.toLowerCase() === '(null)' || v === '') {
        v = null;
    } else if (v.toLowerCase() === 'true') {
        v = true;
    } else if (v.toLowerCase() === 'false') {
        v = false;
    } else if (intRegexp.test(v)) {
        v = parseInt(v, 10);
    } else if (floatRegexp.test(v)) {
        v = parseFloat(v);
    }

    return v;
};
