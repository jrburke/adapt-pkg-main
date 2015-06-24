/*global describe, beforeEach, it */
'use strict';

var fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    exists = fs.existsSync || path.existsSync,
    adaptPkgMain = require('../index'),
    idRegExp = /\{id\}/g,
    defaultAdapterText = 'define([\'./{id}\'], function(m) { return m; });',
    cjsAdapterText = 'module.exports = require(\'./{id}\');';

function recursiveRm(fileName) {
  var files, i, stat;
  if (exists(fileName)) {
    stat = fs.lstatSync(fileName);
    if (stat.isDirectory()) {
      files = fs.readdirSync(fileName);
      for (i = 0; i < files.length; i++) {
        recursiveRm(path.join(fileName, files[i]));
      }
      fs.rmdirSync(fileName);
    } else {
      fs.unlinkSync(fileName);
    }
  }
}

// Only handles directories and files.
function recursiveCopy(source, dest) {
  if (exists(source)) {
    var stat = fs.lstatSync(source);
    if (stat.isDirectory()) {
      if (!exists(dest)) {
        fs.mkdirSync(dest, 511);
      }

      fs.readdirSync(source).forEach(function(segment) {
        recursiveCopy(path.join(source, segment), path.join(dest, segment));
      });
    } else if (stat.isFile()) {
      fs.writeFileSync(dest, fs.readFileSync(source, 'binary'), 'binary');
    }
  }
}

function assertMatch(id, filePath, template) {
  var text = fs.readFileSync(filePath, 'utf8');
  assert.equal(template.replace(idRegExp, id).trim(), text.trim());
}

function assertDefaultMatch(id, filePath) {
  assertMatch(id, filePath, defaultAdapterText);
}

function assertCjsMatch(id, filePath) {
  assertMatch(id, filePath, cjsAdapterText);
}

function resetOutput() {
  var outputPath = path.join(__dirname, 'output');
  recursiveRm(outputPath);
  recursiveCopy(path.join(__dirname, 'source'), outputPath);
}

// Start the tests
describe('adapt-pkg-main', function() {
  var baseDir = path.join(__dirname, 'output', 'defaults', 'my_packages');

  beforeEach(resetOutput);

  it('defaults', function() {
    adaptPkgMain(baseDir);

    assertDefaultMatch('alpha/correct', path.join(baseDir, 'alpha.js'));
    assertDefaultMatch('beta/index', path.join(baseDir, 'beta.js'));

    assertDefaultMatch('multi-main-one-js/lib/main',
                       path.join(baseDir, 'multi-main-one-js.js'));

    assertDefaultMatch('no-config-just-js/sample',
                       path.join(baseDir, 'no-config-just-js.js'));

    assertDefaultMatch('relative-main-id/lib/main',
                       path.join(baseDir, 'relative-main-id.js'));

    assert.equal(true, !exists(path.join(baseDir, 'gamma.js')));
  });

  it('adapterText: cjs', function() {
    adaptPkgMain(baseDir, {
      adapterText: cjsAdapterText
    });

    assertCjsMatch('alpha/correct', path.join(baseDir, 'alpha.js'));
    assertCjsMatch('beta/index', path.join(baseDir, 'beta.js'));
  });

  it('configFileNames: bower,package', function() {
    adaptPkgMain(baseDir, {
      configFileNames: ['bower.json', 'package.json']
    });

    assertDefaultMatch('alpha/incorrect', path.join(baseDir, 'alpha.js'));
  });

  it('include opt', function() {
    adaptPkgMain(baseDir, { include: ['alpha', 'relative-main-id'] });

    [
      'alpha',
      'relative-main-id'
    ].forEach(function(pkgName) {
      assert.equal(
        exists(path.join(baseDir, pkgName + '.js')),
        true,
        pkgName + ' should be included'
      );
    });

    [
      'beta',
      'gamma',
      'multi-main-one',
      'no-config-just-js'
    ].forEach(function(pkgName) {
      assert.equal(
        exists(path.join(baseDir, pkgName + '.js')),
        false,
        pkgName + ' should not be included'
      );
    });
  });
});
