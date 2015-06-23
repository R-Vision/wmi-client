'use strict';

var exec = require('child_process').exec;
var path = require('path');
var convert = require('./convert.js');

/**
 * Constructor
 * @param options
 * @returns {wmic}
 */
var wmic = function (options) {
    this.host = options.host;
    this.username = options.username;
    this.password = options.password;
    this.namespace = options.namespace || '\\\\root\\cimv2';
    this.delimiter = '^@^';
    this.wmic = options.wmic || 'wmic';
    this.isWindows = process.platform === 'win32';

    this.parserOptions = {
        delimiter: this.delimiter,
        trim: true,
        auto_parse: true
    };

    if (this.username) {
        var username = this.username.split('@');

        if (username.length > 1) {
            this.username = username[1] + '\\' + username[0];
        }
    }

    return this;
};

wmic.prototype._parse = function (data, options, callback) {
    var keys = [];
    var result = [];

    data.toString().split(/\r?\n/).forEach(function (line, i) {
        if (i !== 0) {
            var item = line.toString().trim().split(options.delimiter);

            if (options.trim === true) {
                item = item.map(function (v) {
                    return v.trim();
                });
            }

            if (options.auto_parse === true) {
                item = item.map(convert);
            }

            if (i === 1) {
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

    callback(null, result);
};

/**
 * Make args for wmic
 * @returns {Array}
 * @private
 */
wmic.prototype._getArgs = function () {
    return this.isWindows ? this._getArgsForWindows() : this._getArgsForLinux();
};

/**
 * Make args for wmic on linux
 * @returns {Array}
 * @private
 */
wmic.prototype._getArgsForLinux = function () {
    var args = [
        '--delimiter=' + this.delimiter,
        '--namespace=' + this.namespace
    ];

    if (this.username) {
        args.push('--user', this.username);
    }

    if (this.password) {
        args.push('--password=' + this.password);
    } else {
        args.push('--no-pass');
    }

    args.push('//' + this.host, this.wql);

    return args;
};

/**
 * Make args for wmic on windows
 * @returns {Array}
 * @private
 */
wmic.prototype._getArgsForWindows = function () {
    var args = [
        '/NAMESPACE:' + this.namespace,
        '/NODE:' + this.host
    ];

    if (this.username) {
        args.push('/USER:"' + this.username + '"');
    }

    if (this.password) {
        args.push('/PASSWORD:' + this.password);
    }

    args.push(this._wql2wmic(this.wql));
    args.push('/FORMAT:"' + path.join(__dirname, 'csv.xsl') + '":"delimiter=' + this.delimiter + '"');

    return args;
};

/**
 * Convert args to command string for exec
 * @returns {string}
 * @private
 */
wmic.prototype._getExecCommand = function () {
    var args = this._getArgs();
    args.unshift(this.wmic);
    return args.join(' ');
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
        this._exec(callback);
    }

    return this;
};

/**
 * Get results from wmic
 * @param callback
 * @private
 */
wmic.prototype._exec = function (callback) {
    var self = this;

    exec(this._getExecCommand(), function (err, stdout, stderr) {
        if (err || stderr) {
            return callback(err || stderr);
        }

        self._parse(stdout, self.parserOptions, callback);
    });
};

/**
 * Convert WQL to windows wmic format
 * @param query
 * @returns {string}
 * @private
 */
wmic.prototype._wql2wmic = function (query) {
    var queryParse = query.match(/select (.+) from ((\S+) (.+)|(\S+))/i);

    if (!queryParse) {
        throw new Error('Query parse error');
    }

    var fields = queryParse[1].split(',').map(function (v) {
        return v.toString().trim();
    });

    var isWhereExist = Boolean(queryParse[3]);
    var path = isWhereExist ? queryParse[3] : queryParse[2];
    var args = ['path', path];

    if (isWhereExist) {
        args.push(queryParse[4], 'get', fields.join(','));
    } else {
        args.push('get', fields.join(','));
    }

    return args.join(' ');
};

module.exports = wmic;
