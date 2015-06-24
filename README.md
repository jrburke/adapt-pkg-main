## adapt-pkg-main

adapt-pkg-main helps consume modules installed as package directories without needing to configure a module loader to load them.

It is useful for AMD and likely ES6 module projects that do not want to have a loader config entry for every dependency.

## Background

Any front-end (browser based) module loader that allows dynamic loading needs to know how to map a module ID to a file path. The basic convention that works without any configuration, besides perhaps configuring a baseUrl for path lookups, is `baseUrl + moduleId + '.js'`.

However for modules delivered in packages (from package managers like npm and bower), they normally have some sort of config JSON file (like package.json or bower.json), and they specify a "main" value, for the main module ID that should be used by outside code if they ask for the 'packageName' dependency.

For front end loaders, there are two ways to deal with communicating this information to the runtime loader:

### Config Rewriting

The loader has a config API where you can tell it the main module and location for each dependency. A tool can generate this config by inspecting the file system and JSON config files. If using bower and requirejs, [yeoman/bower-requirejs](https://github.com/yeoman/bower-requirejs) is an example of this type of approach.

**Pros**:

* It can avoid some HTTP requests as compared to Main Adapter Writing.

**Cons**:

* Leads to larger config blocks, some of which may not be needed on initial load.
* Requires modifying an app file that has the config in it. Could cause some mismatches in code style.

### Main Adapter Writing

When installing the `packageName` directory, also write out a `packageName.js` file as a sibling to the `packageName` directory, and just have it be a module that depends on the "main" module specified in the config file that was in `packageName`.

Then, when the module loader is asked to load 'packageName', this adapter module is loaded, which then just loads and exports the main module inside the 'packageName' directory.

adapt-pkg-main takes the Main Adapter Writing approach. Ideally package managers would allow this natively as an install option, particularly once ES6 modules become more of a reality.

In the meantime, you can use adapt-pkg-main to do the work, something you trigger after using your package manager, as a post install step.

You do not need to use adapt-pkg-main for every browser load of your project, just whenever there is a change to the installed dependencies for your project.

**Pros**:

* No more giant loader config blocks
* Distributes the "config" to when the modules are actually needed.

**Cons**:

* In a non-build scenario, an extra HTTP request to fetch the adapter module.

## Installation

Runs in nodejs, or iojs, installed via npm:

```
npm install adapt-pkg-main
```

## API

adapt-pkg-main can be used in script as a require()'d module in another node module, or on the command line.

The script API is best to use if you have an existing node-based toolchain for builds and installs, like grunt or gulp. The command line API is best to use if you just want a command to run as part of a Makefile or shell script setup.

### Script API

```javascript
// Takes a directory string, and an optional options object.
// Synchronously completes and throws if there is an error.
require('adapt-pkg-main')(dirPath, {
  configFileNames: [],
  adapterText: ''
});
```

**dirPath** is the directory path, as a string, to scan for packages. This is likely the directory your package manager has installed dependencies, like `bower_components` or `node_modules`. It should contain directories which are the actual packages of JS code that have been installed by a package manager.

adapt-pkg-main only does one level of directory scanning. It does not try to recursively scan for other directories containing module packages, like nested `node_modules`.

For those nested cases, do the subdirectory scan outside of adapt-pkg-main, and call adapt-pkg-main with each directory (although that case likely entails setting up some other loader config, like the [requirejs map config](http://requirejs.org/docs/api.html#config-map) manually or using some other tool for that config).

### Example

If the directory structure is like this:

* my_packages
  * alpha
  * beta

Then `require('adapt-pkg-main')('my_packages')` will scan alpha and beta for "main" package config, looking first for package.json, and if not there then bower.json, and a `my_packages/alpha.js` and `my_packages/beta.js` will be generated in AMD format.

### Options

The options object is optional, and can have the following properties:

**configFileNames**: An array of JSON-formated file names to check for a "main" property in each package. The default is `['package.json', 'bower.json']`. The order of the entries is the order adapt-pkg-main uses to find a "main" entry.

**include**: An array of top level directory names in node_modules. Instead of creating adapters for all directories in node_modules, this option will only adapt the directories listed in the `includes` array. This is useful when the node_modules includes libraries used in node, and there are only a few of them you want to use in a `baseUrl + moduleId + '.js'` style of loader.

**adapterText**: A string that is used for the module body of the adapter. The default is:

```javascript
define(['./{id}'], function(m) { return m; });
````

The `{id}` part is replaced by adapt-pkg-main with the name of the package's main module ID.

If wanting to write out the adapters in Node's module format, you can pass the string `module.exports = require('./{id}');`.

### Command line API

If this is locally installed in a project's node_modules directory, it can be run like so:

```
node_modules/.bin/adapt-pkg-main dirPath
```

Where `dirPath` is the directory path to scan. See the Script API section for more details on the arguments. The options object properties can be passed via `name=value` strings, and the arrays used for `include` and `configFileNames` can just be a comma separated string. Example:

```
node_modules/.bin/adapt-pkg-main bower_components configFileNames=bower.json,package.json include=foo,bar adapterText="something that uses {id}"
```

## Suggested loader configuration setup

This section uses an AMD loader, requirejs, for illustration, but the general config approach should be adaptable to other front end module loaders that support dynamic loading.

Ideally, your project is set up like so:

* index.html
* app.js (the script that has the loader config)
* app/ (app-specific modules go in here)
  * main.js (the main app module)
* my_packages/ (holds third party module packages)


The `my_packages` directory might be called `bower_components` or `node_modules` or something else in your project. The main point is that a package manager handles installations into that folder.

The app.js would look like this:

```javascript
requirejs.config({
    baseUrl: 'my_packages',
    paths: {
        app: '../app'
    }
});

// Start loading the main app module.
requirejs(['app/main']);
```

From then on, for any of your app modules in `app/` they relative module IDs to refer to each other. Use `adapt-pkg-main` to handle writing out the adapter modules in `my_packages` after new dependency installs so that this config block should hopefully not need to be touched again to put in path information.

The [volojs/create-template](https://github.com/volojs/create-template) is a template project that has this sort of directory config if you want to see a fuller project example. That project uses `lib` instead of `my_packages`, and does not use `adapt-pkg-name` directly, just shows how to set up the initial file layout and config.
