#!/usr/bin/env node

const {program} = require('commander');
const {readFileSync, existsSync} = require('fs');
const {resolve, dirname, isAbsolute} = require('path');
const {generateAjvSchema} = require('adv-parser');
const {getProp} = require('adv-parser/lib/object');
const getFiles = require('./lib/getFiles');
const filesToEndpoints = require('./lib/filesToEndpoints');

program
.option('-c, --config <path>', 'path to config json file')
.option('-i, --include <path>', 'path to source file')
.option('-a, --api-client <path>', 'generate api client')
.option('-d, --api-dts <path>', 'generate api client .d.ts file')
.option('-b, --base-url <url>', 'default Api.baseUrl')
.option('-p, --base-path <path>', 'base path for @see filename comment')
.option('-e, --express <path>', 'generate express middleware validator')
.option('-o, --open-api <path>', 'generate Swagger OpenAPI v3 json')
.option('-j, --json <path>', 'generate endpoints json')
.option('-n, --namespace <namespace>', 'generate validators only with this namespace or comma separated namespaces')
.option('-M, --default-method <method>', 'default @url METHOD')
.option('-C, --default-code <code>', 'default @response CODE')
.option('-S, --default-schemas <path>', 'path to js file with default schemas')
.option('-J, --jsdoc-methods <boolean>', 'generate methods @type, default true')
.option('-T, --jsdoc-typedefs <boolean>', 'generate @typedef, default true')
.option('-R, --jsdoc-refs <boolean>', 'use references to jsdoc @typedef or replace them with reference body, default true')
.option('-I, --include-jsdoc <boolean>', 'include to endpoints standard jsdoc annotations, default false')
.option('-P, --extra-props <boolean>', 'value for ajv "object" additionalProperties, default false')
.option('-N, --class-name <string>', 'name of generated api client class, default "Api"')
.option('--path-to-regexp <boolean>', 'whether to add a path-to-regexp support, default true')
.option('--request-method <boolean>', 'whether to add a Api.request method, default true')
.option('--get-ajv-method <boolean>', 'whether to add a Api.getAjv method, default true')
.option('--error-handler-method <boolean>', 'whether to add a Api.errorHandler method, default true')
;

program.parse(process.argv);

const CWD = process.cwd();

let configPath = program.config;

if (configPath) {
	if (!isAbsolute(configPath)) {
		configPath = resolve(CWD, configPath);
	}

	if (!existsSync(configPath)) {
		throw new Error(`Config file not found: ${JSON.stringify(configPath)}`);
	}
}

const configDir = configPath ? dirname(configPath) : CWD;
const config = configPath ? JSON.parse(readFileSync(configPath, 'utf-8')) : {};

defaults(config, program, [
	'include',
	'baseUrl',
	'namespace',
	'defaultMethod',
	'defaultCode',
	'defaultSchemas',
	'jsdocRefs',
	'jsdocTypedefs',
	'jsdocMethods',
	'includeJsdoc',
	'extraProps',
	'className',
	'pathToRegexp',
	'requestMethod',
	'getAjvMethod',
	'errorHandlerMethod',
]);

resolvePath(config, program, [
	'basePath',
	'apiClient',
	'apiDts',
	'express',
	'openApi',
	'json',
	'defaultSchemas',
]);

if (!config.include) {
	throw new Error(`config.include is required`);
}

if (typeof config.include === 'string') {
	config.include = [config.include];
}

if (typeof config.exclude === 'string' && config.exclude) {
	config.exclude = [config.exclude];
}

config.include = config.include.map(path => resolve(configDir, path));
config.exclude = config.exclude && config.exclude.map(path => resolve(configDir, path));

if (config.defaultSchemas) {
	try {
		require.resolve(config.defaultSchemas);
	}
	catch (err) {
		throw new Error(`Default schemas file not found: ${JSON.stringify(config.defaultSchemas)}`);
	}
}

const defaultSchemas = require(config.defaultSchemas || 'adv-parser/schemas');

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

if (typeof config.extraProps === 'boolean') {
	getProp(defaultSchemas.object, 'additionalProperties').value.value = config.extraProps;
}

var cache = {...defaultSchemas};

filesToEndpoints(files, {...config, schemas: cache})
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
		const generateApiClient = require('./lib/generate/apiClient');

		promises.push(
			generateApiClient(endpoints, config.apiClient, {
				baseUrl: config.baseUrl,
				basePath: config.basePath,
				schemas,
				dtsFile: config.apiDts,
				jsdocMethods: config.jsdocMethods,
				jsdocTypedefs: config.jsdocTypedefs,
				jsdocRefs: config.jsdocRefs,
				pathToRegexp: config.pathToRegexp,
				className: config.className,
				requestMethod: config.requestMethod,
				getAjvMethod: config.getAjvMethod,
				errorHandlerMethod: config.errorHandlerMethod,
			})
		);
	}

	if (config.express) {
		const generateExpressMiddleware = require('./lib/generate/expressMiddleware');

		promises.push(
			generateExpressMiddleware(endpoints, config.express, {
				schemas,
				jsdocTypedefs: config.jsdocTypedefs,
			})
		);
	}

	if (config.openApi) {
		const generateOpenApi = require('./lib/generate/openApi');

		promises.push(
			generateOpenApi(endpoints.filter(e => !!e.url), config.openApi)
		);
	}

	if (config.json) {
		const generateJson = require('./lib/generate/json');

		promises.push(
			generateJson(endpoints.filter(e => !!e.url), config.json)
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


function resolvePath(target, src, props) {
	for (let prop of props) {
		let path = src[prop] || target[prop];
		target[prop] = path && resolve(configDir, path);
	}
}

function defaults(target, src, props) {
	for (let prop of props) {
		let value = target[prop] = src[prop] || target[prop];

		try {
			if (value && typeof value === "string") {
				target[prop] = JSON.parse(value);
			}
		}
		catch (err) {}
	}
}