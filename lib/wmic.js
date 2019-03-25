'use strict';

var getos = require('./getos');
var path = require('path');
var readline = require('readline');
var spawn = require('child_process').spawn;

var getNamespace = require('./namespace.js');
var getUsername = require('./username.js');
var convert = require('./convert.js');

/**
 * Constructor
 * @param options
 * @returns {wmic}
 */
var wmic = function (options) {
    this.isWindows = process.platform === 'win32';

    this.options = options || {};
    this.host = this.options.host || (this.isWindows ? '127.0.0.1' : null);
    var user = getUsername(this.options.username);
    this.username = user.username;
    this.domain = user.domain;
    this.password = this.options.password;
    this.namespace = this.options.namespace || '\\\\root\\cimv2';
    this.timeout = this.options.timeout || 90000;
    this.delimiter = '^@^';
    this.wmic = this.options.wmic || 'wmic';
    this.isNeedNTLM2 = this.options.ntlm2 || false;

    // Option mostly needed for when e.g. zeit/pkg is used to create standalone .exe,
    // since neither __dirname, nor relative paths will work as expected.
    // https://github.com/zeit/pkg/issues/342
    this.cwd = this.options.cwd || path.join(__dirname, '..');

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

    if (this.domain) {
        args.push('--workgroup=' + this.domain);
    }

    if (this.password) {
        args.push('--password=' + this.password);
    } else {
        args.push('--no-pass');
    }

    if (this.isNeedNTLM2) {
        args.push('--option=client ntlmv2 auth=Yes');
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

    var user = '/USER:';

    if (this.username) {
        user += this.username;

        if (this.domain) {
            user += '@' + this.domain;
        }

        args.push(user);
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
        cwd: this.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });

    var rl = readline.createInterface({
        input: wmic.stdout,
        terminal: false,
        crlfDelay: Infinity
    });

    var result = [];
    var keys = [];

    rl.on('line', function (line) {
        if (line.length === 0 || line.indexOf('CLASS: ') === 0) return;

        var item = line.toString().trim().split(self.parserOptions.delimiter);

        if (self.parserOptions.trim === true) {
            item = item.map(function (v) {
                return v.trim();
            });
        }

        if (self.parserOptions.auto_parse === true) {
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
            callback(null, result);
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
        var conditions = queryParse[4].replace(/^where\s*/i, '');
        args.push('where', conditions);
    }

    args.push('get', fields.join(','));

    return args;
};

module.exports = wmic;
