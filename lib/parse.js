'use strict';

var convert = require('./convert.js');

module.exports = function (data, options) {
    var keys = [];
    var result = [];

    data.toString().split(/\r?\n/).forEach(function (line) {
        if (line.toString().indexOf(options.delimiter) !== -1) {
            var item = line.toString().trim().split(options.delimiter);

            if (options.trim === true) {
                item = item.map(function (v) {
                    return v.trim();
                });
            }

            if (options.auto_parse === true) {
                item = item.map(convert);
            }

            if (keys.length === 0) {
                keys = item;
            } else if (item.length === keys.length) {
                var obj = {};

                item.forEach(function (value, j) {
                    obj[keys[j]] = value;
                });

                result.push(obj);
            }
        }
    });

    return result;
};
