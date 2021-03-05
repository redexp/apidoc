#!/usr/bin/env node

const {program} = require('commander');
const fs = require('fs');
const {resolve, dirname} = require('path');
const {getDefaultSchemas} = require('./lib/schemas');
const getFiles = require('./lib/getFiles');
const filesToEndpoints = require('./lib/filesToEndpoints');
const {generateAjvSchema} = require('./lib/parseSchema');
const generateApiClient = require('./lib/generate/apiClient');
const generateExpressMiddleware = require('./lib/generate/expressMiddleware');

program
	.requiredOption('-c, --config <path>', 'path to config json file')
	.option('-a, --api-client <path>', 'generate api client')
	.option('-b, --base-url <url>', 'default Api.baseUrl')
	.option('-e, --express <path>', 'generate express middleware validator')
	.option('-n, --namespace <namespace>', 'generate validators only with this namespace or comma separated namespaces')
	.option('-M, --default-method <method>', 'default @url METHOD')
	.option('-C, --default-code <code>', 'default @response CODE')
	.option('-T, --jsdoc-typedefs <boolean>', 'generate typedef, default true')
	.option('-R, --jsdoc-refs <boolean>', 'use references to jsdoc @typedef or replace them with reference body, default true')
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
config.apiClient = program.apiClient || (config.apiClient && resolve(configDir, config.apiClient));
config.express = program.express || (config.express && resolve(configDir, config.express));

defaults(config, program, [
	'baseUrl',
	'namespace',
	'defaultMethod',
	'defaultCode',
	'jsdocRefs',
	'jsdocTypedefs',
]);

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

var defaultSchemas = getDefaultSchemas();
var cache = {...defaultSchemas};

filesToEndpoints(files, {...config, cache})
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

		var schemas = {};

		for (let name in cache) {
			if (defaultSchemas.hasOwnProperty(name)) continue;

			schemas[name] = generateAjvSchema(cache[name], cache);
		}

		var promises = [];

		if (config.apiClient) {
			promises.push(
				generateApiClient(config.apiClient, {
					baseUrl: config.baseUrl,
					endpoints: endpoints.filter(e => !!e.call),
					schemas,
					jsdocTypedefs: config.jsdocTypedefs,
					jsdocRefs: config.jsdocRefs,
				})
			);
		}

		if (config.express) {
			promises.push(
				generateExpressMiddleware(config.express, {
					endpoints,
					schemas,
					jsdocTypedefs: config.jsdocTypedefs,
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

function defaults(target, src, props) {
	props.forEach(function (prop) {
		var value = target[prop] = src[prop] || target[prop];

		try {
			target[prop] = JSON.parse(value);
		}
		catch (err) {}
	});
}