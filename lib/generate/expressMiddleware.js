const fs = require('fs');
const {resolve, dirname} = require('path');
const mkdir = require('mkdirp');

module.exports = function (file, {endpoints}) {
	mkdir.sync(dirname(file));

	endpoints = endpoints
		.filter(e => !!e.url)
		.map(function (e) {
			return {
				...e,
				call: undefined
			};
		});

	const tpl = fs.readFileSync(resolve(__dirname, '..', 'templates', 'express-middleware.js')).toString();

	fs.writeFileSync(file, tpl.replace('const endpoints = []', 'const endpoints = ' + JSON.stringify(endpoints)));

	return Promise.resolve();
};