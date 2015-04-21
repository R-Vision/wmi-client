'use strict';

var parse = require('csv-parse');
var exec = require('child_process').execFile;

/**
 * Constructor
 * @param options
 * @returns {wmic}
 */
var wmic = function (options) {
    this.host = options.host;
    this.username = options.username;
    this.password = options.password;
    this.namespace = options.namespace || 'root\\cimv2';
    this.delimiter = '^@^';
    this.wmic = options.wmic || 'wmic';

    this.parserOptions = {
        delimiter: this.delimiter,
        trim: true,
        auto_parse: true,
        columns: true,
        skip_empty_lines: true,
        comment: 'CLASS:'
    };

    return this;
};

/**
 * Convert string "(null)" to null
 * @param data
 * @returns {*}
 */
var convertNull = function (data) {
    data.forEach(function (item) {
        for (var key in item) {
            if (item.hasOwnProperty(key)) {
                if (item[key] === '(null)') {
                    item[key] = null;
                }
            }
        }
    });

    return data;
};

/**
 * Make args for wmic
 * @returns {*[]}
 * @private
 */
wmic.prototype._getArgs = function () {
    var args = [
        '--delimiter=' + this.delimiter,
        '--namespace=' + this.namespace
    ];

    if (this.password) {
        args.push('--password=' + this.password);
    } else {
        args.push('--no-pass');
    }

    if (this.username) {
        var username = this.username.split('@');

        if (username.length > 1) {
            this.username = username[1] + '/' + username[0];
        }

        args.push('--user', this.username);
    }

    args.push('//' + this.host, this.wql);

    return args;
};

/**
 * Prepeare WQL query
 * @param wql
 * @param namespace
 * @param callback
 * @returns {wmic}
 */
wmic.prototype.query = function (wql, namespace, callback) {
    this.wql = wql;

    if (typeof namespace === 'string') {
        this.namespace = namespace;
    } else if (typeof namespace === 'function') {
        callback = namespace;
    }

    if (typeof callback === 'function') {
        this.exec(callback);
    }

    return this;
};

/**
 * Get results from wmic
 * @param callback
 */
wmic.prototype.exec = function (callback) {
    var self = this;

    exec(this.wmic, this._getArgs(), function (err, stdout, stderr) {
        if (err || stderr) {
            return callback(err || stderr);
        }

        parse(stdout, self.parserOptions, function (err, data) {
            if (data) {
                data = convertNull(data);
            }

            callback(err, data);
        });
    });
};

module.exports = wmic;
