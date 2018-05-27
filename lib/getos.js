/**
 * Simplified version 3.1.0 of https://github.com/retrohacker/getos/
 */

var fs = require('fs');
var os = require('os');
var distros = require('./os.json');

/**
 * Begin definition of globals.
 */
var cachedDistro = null; // Store result of getLinuxDistro() after first call

module.exports = function getOs (cb) {
    var osName = os.platform();
    if (osName === 'linux') return getLinuxDistro(cb);
    return cb(null, {'os': osName});
};

function getLinuxDistro (cb) {
    /**
     * First, we check to see if this function has been called before.
     * Since an OS doesn't change during runtime, its safe to cache
     * the result and return it for future calls.
     */
    if (cachedDistro) return cb(null, cachedDistro);

    /**
     * We are going to take our list of release files from os.json and
     * check to see which one exists. It is safe to assume that no more
     * than 1 file in the list from os.json will exist on a distribution.
     */
    getReleaseFile(Object.keys(distros), function (e, file) {
        if (e) return cb(e);

        /**
         * Multiple distributions may share the same release file.
         * We get our array of candidates and match the format of the release
         * files and match them to a potential distribution
         */
        var candidates = distros[file];
        var os = { 'os': 'linux', 'dist': candidates[0] };

        cb(null, os);
    })(); // sneaky sneaky.
}

/**
 * getReleaseFile() checks an array of filenames and returns the first one it
 * finds on the filesystem.
 */
function getReleaseFile (names, cb) {
    var index = 0; // Lets keep track of which file we are on.
    /**
     * checkExists() is a first class function that we are using for recursion.
     */
    return function checkExists () {
        /**
         * Lets get the file metadata off the current file.
         */
        fs.stat(names[index], function (e, stat) {
            /**
             * Now we check if either the file didn't exist, or it is something
             * other than a file for some very very bizzar reason.
             */
            if (e || !stat.isFile()) {
                index++; // If it is not a file, we will check the next one!
                if (names.length <= index) { // Unless we are out of files.
                    return cb(new Error('No unique release file found!')); // Then error.
                }
                return checkExists(); // Re-call this function to check the next file.
            }
            cb(null, names[index]); // If we found a file, return it!
        });
    };
}
