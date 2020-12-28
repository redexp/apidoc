const {program} = require('commander');
const fs = require('fs');
const {resolve, dirname} = require('path');
const getFiles = require('./lib/getFiles');
const filesToEndpoints = require('./lib/filesToEndpoints');
const generateTests = require('./lib/generate/tests');
const generateExpressMiddleware = require('./lib/generate/expressMiddleware');

program
	.requiredOption('-c, --config <path>', 'path to config json file')
	.option('-t, --tests <path>', 'generate validator for tests')
	.option('-e, --express <path>', 'generate express middleware validator')
	.option('-h, --host <address>', 'host for tests requests')
	.option('-n, --namespace <namespace>', 'generate validators only with this namespace or comma separated namespaces')
;

program.parse(process.argv);

const configPath = program.config;

if (!fs.existsSync(configPath)) {
	throw new Error('config file not found: ' + JSON.stringify(configPath));
}

const configDir = dirname(configPath);
const config = JSON.parse(fs.readFileSync(configPath).toString());

if (!config.include) {
	throw new Error(`config.include is required`);
}

config.include = config.include.map(path => resolve(configDir, path));
config.exclude = config.exclude && config.exclude.map(path => resolve(configDir, path));
config.tests = program.tests || (config.tests && resolve(configDir, config.tests));
config.express = program.express || (config.express && resolve(configDir, config.express));
config.host = program.host || config.host;
config.namespace = program.namespace || config.namespace;

var files = getFiles(config.include);

if (config.exclude) {
	let exclude = getFiles(config.exclude);

	files = files.filter(function (file) {
		return !exclude.includes(file);
	});
}

if (config.namespace && !Array.isArray(config.namespace)) {
	config.namespace = config.namespace.split(',').map(v => v.trim()).filter(v => !!v);
}

filesToEndpoints(files)
	.then(function (endpoints) {
		if (config.namespace) {
			let namespaces = config.namespace.reduce(function (hash, name) {
				hash[name] = true;
				return hash;
			}, {});

			endpoints = endpoints.filter(function (e) {
				return namespaces[e.namespace] === true;
			});
		}

		var promises = [];

		if (config.tests) {
			promises.push(
				generateTests(config.tests, {
					host: config.host,
					endpoints: endpoints.filter(e => !!e.call),
				})
			);
		}

		if (config.express) {
			promises.push(
				generateExpressMiddleware(config.express, {
					endpoints,
				})
			);
		}

		return Promise.all(promises);
	})
	.then(function () {
		process.exit();
	})
	.catch(function (err) {
		console.error(err);
		process.exit(1);
	});