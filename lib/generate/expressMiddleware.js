const {readFile, writeFile} = require('fs/promises');
const {resolve, dirname} = require('path');
const {mkdirpSync} = require('mkdirp');
const ajvToJsDoc = require('../ajvToJsDoc');

module.exports = async function (endpoints, file, {schemas = {}, jsdocTypedefs = true} = {}) {
	mkdirpSync(dirname(file));

	endpoints = endpoints.filter(e => !!e.url);

	const defs = (
		jsdocTypedefs &&
		Object
		.keys(schemas)
		.map(name => (
			`/** @typedef {${ajvToJsDoc(schemas[name])}} ${name} */\n`
		))
		.join('')
	);

	const tpl = await readFile(resolve(__dirname, '..', 'templates', 'express-middleware.js'));

	return writeFile(
		file,
		(defs || '') +
		tpl.toString()
		.replace(
			'const endpoints = []',
			'const endpoints = ' + JSON.stringify(endpoints)
		)
	);
};