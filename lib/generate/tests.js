const fs = require('fs');
const {resolve, dirname} = require('path');
const mkdir = require('mkdirp');
const endpointToTest = require('../endpointToTest');

module.exports = function (file, {host, endpoints}) {
	const dir = dirname(file);

	if (!fs.existsSync(dir)) {
		mkdir.sync(dir);
	}

	const tpl = fs.readFileSync(resolve(__dirname, '..', 'templates', 'tests-header.js')).toString();
	const stream = fs.createWriteStream(file);

	var p = new Promise(function (done, fail) {
		stream.on('finish', done);
		stream.on('error', fail);
	});

	var namespaces = {};

	endpoints.forEach(function (endpoint) {
		var {parts} = endpoint.call;

		for (var i = 0; i < parts.length - 1; i++) {
			var prop = parts[i];
			if (!namespaces.hasOwnProperty(prop)) {
				namespaces[prop] = {};
			}
		}
	});

	stream.write(
		tpl.replace(/(\bhost\b|\bnamespaces\b)/g, function (x, name) {
			switch (name) {
			case 'host':
				return JSON.stringify(host);

			case 'namespaces':
				return JSON.stringify(namespaces, null, '  ');
			}
		})
	);

	endpoints.forEach(function (endpoint) {
		stream.write(endpointToTest(endpoint));
	});

	stream.end();

	return p;
};