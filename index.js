'use strict';
var fs = require('fs'),
    path = require('path'),
    exists = fs.existsSync || path.existsSync,
    relativeSegmentRegExp = /^\.\//,
    jsExtRegExp = /\.js$/,
    idRegExp = /\{id\}/g,
    badExtensions = {
      'css': true,
      'html': true,
      'htm': true
    };

var optDefaults = {
  configFileNames: ['package.json', 'bower.json'],
  adapterText: 'define([\'./{id}\'], function(m) { return m; });'
};

function mix(target, source, override) {
  Object.keys(source).forEach(function(key) {
    if (!target.hasOwnProperty(key) || override) {
      target[key] = source[key];
    }
  });
  return target;
}

function getConfigPath(dir, configFileNames) {
  var finalPath = null;
  configFileNames.some(function(configFileName) {
    var testPath = path.join(dir, configFileName);
    if (exists(testPath) && fs.statSync(testPath).isFile()) {
      finalPath = testPath;
      return true;
    }
  });

  return finalPath;
}

// Given an array of file paths, only return a value if there is only
// one that ends in a .js extension.
function findOneJsInArray(ary) {
  var found,
      count = 0;
  ary.forEach(function(entry) {
    if (jsExtRegExp.test(entry)) {
      count += 1;
      found = entry;
    }
  });

  return count === 1 ? found : null;
}

module.exports = function(dir, opts) {
  if (typeof dir !== 'string' || !dir) {
    throw new Error('Missing first argument as a string for the directory');
  }

  opts = mix(mix({}, opts || {}), optDefaults);

  if (typeof opts.adapterText !== 'string' || ! opts.adapterText) {
    throw new Error('adapterText needs to be a non-empty string');
  }
  if (!Array.isArray(opts.configFileNames) || !opts.configFileNames.length) {
    throw new Error('configFileNames needs to be a non-zero array');
  }
  if ('include' in opts && !Array.isArray(opts.include)) {
    throw new Error('include needs to be an array');
  }

  fs.readdirSync(dir)
    .filter(function(pkgName) {
      return (!('include' in opts)) || opts.include.indexOf(pkgName) !== -1;
    })
    .forEach(function(pkgName) {
      var pkgPath = path.join(dir, pkgName);
      if (!fs.statSync(pkgPath).isFile()) {
        var main,
            configFile = getConfigPath(pkgPath, opts.configFileNames);

        if (configFile) {
          var contents = fs.readFileSync(configFile, 'utf8');

          if (contents) {
            var config = JSON.parse(contents);

            main = config.main;

            if (Array.isArray(main)) {
              // A bower thing. Need to find main value.
              if (main.length === 0) {
                main = null;
              } else if (main.length === 1) {
                main = main[0];
              } else {
                main = findOneJsInArray(main);
              }
            }
          }
        } else {
          // No config files.
          // May not have a main, but the the directory just has one JS
          // file in it, then use that as the main.
          main = findOneJsInArray(fs.readdirSync(pkgPath));
        }


        if (!main) {
          return;
        }

        // Ignore main values that may not be JS files. Cannot just blindly
        // rely on the value of whatever is past the last dot and discard if
        // not JS, since some front end library ecosystems, like jQuery
        // plugins, use dots to segment parts of their names. So going with
        // an exclusion list instead.
        var ext = path.extname(main);
        if (ext.indexOf('.') === 0) {
          ext = ext.substring(1);
        }

        if (badExtensions.hasOwnProperty(ext)) {
          return;
        }

        // Confirm the main file actually exists.
        var mainPath = path.join(pkgPath, main);
        if (!exists(mainPath) && !exists(mainPath + '.js')) {
          console.error('WARNING: ' +
                        mainPath +
                        ' does not exist, skipping.');
          return;
        }

        // Remove any trailing relative path segment, just to make it prettier.
        main = main.replace(relativeSegmentRegExp, '');

        // Remove any trailing .js extension, since it is not needed for
        // module IDs, and mixes up the separation of IDs from paths.
        main = main.replace(jsExtRegExp, '');

        var text = opts.adapterText.replace(idRegExp, pkgName + '/' + main);
        fs.writeFileSync(path.join(dir, pkgName + '.js'), text, 'utf8');
      }
    });
};
