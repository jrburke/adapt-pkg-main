#!/usr/bin/env node

'use strict';
var adaptPkgMain = require('../index');

// Ignore "node" and this file's name
var args = process.argv.slice(2),
    opts = {},
    dir = args[0],
    optArgs = args.slice(1);

if (!dir) {
  console.log('See https://github.com/jrburke/adapt-pkg-main for docs');
  process.exit(0);
}

optArgs.forEach(function(optArg) {
  var parts = optArg.split('='),
      key = parts[0],
      value = parts[1];

  if (parts.length !== 2) {
    throw new Error('Malformed option argument: ' + optArg);
  }

  if (key === 'configFileNames') {
    opts[key] = value.split(',');
  } else {
    opts[key] = parts[value];
  }
});

adaptPkgMain(dir, opts);
