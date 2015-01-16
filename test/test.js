/*global describe, before, it */
'use strict';

var fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    exists = fs.existsSync || path.existsSync,
    adaptPkgMain = require('../index');

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
        fs.mkdirSync(dest);
      }

      fs.readdirSync(source).forEach(function(segment) {
        recursiveCopy(path.join(source, segment), path.join(dest, segment));
      });
    } else if (stat.isFile()) {
      fs.writeFileSync(dest, fs.readFileSync(source, 'binary'), 'binary');
    }
  }
}

function defaultMatch(id) {

}

describe('adapt-pkg-main', function() {
  before(function() {
    var outputPath = path.join(__dirname, 'output');
    recursiveRm(outputPath);
    recursiveCopy(path.join(__dirname, 'source'), outputPath);
  });

  describe('defaults', function() {
    var baseDir = path.join(__dirname, 'output', 'defaults', 'my_packages');
    adaptPkgMain(baseDir);
    it('has correct adapter files', function() {

      assert.equal(1, 1);
      // assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
});
