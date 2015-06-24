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

// Convert name=value command args into options[name]: value args
optArgs.forEach(function(optArg) {
  var index = optArg.indexOf('=');

  if (index === -1) {
    throw new Error('Malformed option argument: ' + optArg);
  }

  var key = optArg.substring(0, index),
      value = optArg.substring(index + 1);

  if (key === 'configFileNames' || key === 'include') {
    opts[key] = value.split(',');
  } else {
    opts[key] = value;
  }
});

adaptPkgMain(dir, opts);
