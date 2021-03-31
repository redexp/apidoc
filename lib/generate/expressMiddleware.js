const fs = require('fs');
const {promisify} = require('util');
const {resolve, dirname} = require('path');
const mkdir = require('mkdirp');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const ajvToJsDoc = require('../ajvToJsDoc');

module.exports = async function (endpoints, file, {schemas = {}, jsdocTypedefs = true}) {
	mkdir.sync(dirname(file));

	endpoints = endpoints.filter(e => !!e.url);

	const defs = jsdocTypedefs && Object.keys(schemas).map(name => `/** @typedef {${ajvToJsDoc(schemas[name])}} ${name} */\n`).join('') || '';

	const tpl = await readFile(resolve(__dirname, '..', 'templates', 'express-middleware.js'));

	return writeFile(
		file,
		defs +
		tpl.toString().replace('const endpoints = []', 'const endpoints = ' + JSON.stringify(endpoints))
	);
};