'use strict';

var getos = require('getos');
var path = require('path');
var spawn = require('child_process').spawn;

var getNamespace = require('./namespace.js');
var getUsername = require('./username.js');
var parse = require('./parse.js');

/**
 * Constructor
 * @param options
 * @returns {wmic}
 */
var wmic = function (options) {
    this.options = options;
    this.host = options.host;
    this.username = getUsername(options.username);
    this.password = options.password;
    this.namespace = options.namespace || '\\\\root\\cimv2';
    this.timeout = options.timeout || 90000;
    this.delimiter = '^@^';
    this.wmic = options.wmic || 'wmic';
    this.isWindows = process.platform === 'win32';

    this.parserOptions = {
        delimiter: this.delimiter,
        trim: true,
        auto_parse: true
    };

    return this;
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
        '--namespace=' + getNamespace(this.namespace)
    ];

    if (this.username) {
        args.push('--user=' + this.username);
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
        '/NAMESPACE:' + getNamespace(this.namespace),
        '/NODE:' + this.host
    ];

    if (this.username) {
        args.push('/USER:' + this.username);
    }

    if (this.password) {
        args.push('/PASSWORD:' + this.password);
    }

    args = args.concat(this._wql2wmic(this.wql));
    args.push('/FORMAT:\'lib/csv.xsl\':\'delimiter=' + this.delimiter + '\'');

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
    var self = this;

    this.wql = wql;

    if (typeof namespace === 'string') {
        this.namespace = namespace;
    } else if (typeof namespace === 'function') {
        callback = namespace;
    }

    if (typeof callback === 'function') {
        if (!this.options.wmic && process.platform === 'linux' && process.arch === 'x64') {
            getos(function (err, os) {
                if (err) {
                    callback(err);
                }

                if (os.dist.search(/ubuntu/i) === 0 || os.dist.search(/debian/i) === 0) {
                    self.wmic = 'bin/wmic_ubuntu_x64';
                } else if (os.dist.search(/centos/i) === 0 || os.dist.search(/redhat/i) === 0) {
                    self.wmic = 'bin/wmic_centos_x64';
                }

                self._exec(callback);
            });
        } else {
            this._exec(callback);
        }
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

    var wmic = spawn(this.wmic, this._getArgs(), {
        cwd: path.join(__dirname, '..'),
        stdio: ['ignore', 'pipe', 'pipe']
    });

    var stdout = '';

    wmic.stdout.on('data', function (data) {
        stdout += data;
    });

    var stderr = '';

    wmic.stderr.on('data', function (data) {
        stderr += data;
    });

    var to = setTimeout(function () {
        stderr = 'Child process killed by timeout (' + self.timeout / 1000 + ' seconds)';
        wmic.kill();
    }, self.timeout);

    wmic.on('close', function (code) {
        if (code !== 0) {
            callback(new Error('Exit code: ' + code + '. ' + stderr));
        } else {
            callback(null, parse(stdout, self.parserOptions));
        }
    });

    wmic.on('exit', function () {
        clearTimeout(to);
    });
};

/**
 * Convert WQL to windows wmic format
 * @param query
 * @returns {Array}
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

    return args;
};

module.exports = wmic;
