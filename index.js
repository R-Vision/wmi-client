'use strict';

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
    this.intRegexp = /^(\-|\+)?([1-9]+[0-9]*)$/;
    this.floatRegexp = /^(\-|\+)?([0-9]+(\.[0-9]+)?([eE][0-9]+)?|Infinity)$/;

    this.parserOptions = {
        delimiter: this.delimiter,
        trim: true,
        auto_parse: true
    };

    return this;
};

wmic.prototype._parse = function (data, options, callback) {
    var self = this;
    var keys = [];
    var result = [];

    data.toString().split(/\r?\n/).forEach(function (line, i) {
        if (i !== 0) {
            var item = line.split(options.delimiter);

            if (i === 1) {
                keys = item;
            } else if (item.length === keys.length) {
                var obj = {};

                item.forEach(function (value, j) {
                    if (options.trim === true) {
                        value.toString().trim();
                    }

                    if (options.auto_parse === true) {
                        if (value.toLowerCase() === '(null)') {
                            value = null;
                        } else if (value.toLowerCase() === 'true') {
                            value = true;
                        } else if (value.toLowerCase() === 'false') {
                            value = false;
                        } else if (self.intRegexp.test(value)) {
                            value = parseInt(value, 10);
                        } else if (self.floatRegexp.test(value)) {
                            value = parseFloat(value);
                        }
                    }

                    obj[keys[j]] = value;
                });

                result.push(obj);
            }
        }
    });

    callback(null, result);
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

        self._parse(stdout, self.parserOptions, callback);
    });
};

module.exports = wmic;
