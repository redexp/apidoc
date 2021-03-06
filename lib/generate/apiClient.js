const fs = require('fs');
const {resolve, dirname} = require('path');
const mkdir = require('mkdirp');
const Ajv = require('ajv').default;
const ajv = new Ajv({coerceTypes: true});
const ajvToJsDoc = require('../ajvToJsDoc');

module.exports = function (file, {baseUrl = '', endpoints, schemas = {}, jsdocTypedefs = true, jsdocRefs = true}) {
	mkdir.sync(dirname(file));

	const mainTpl = fs.readFileSync(resolve(__dirname, '..', 'templates', 'api-client.js')).toString();
	const methodTpl = fs.readFileSync(resolve(__dirname, '..', 'templates', 'api-client-method.js')).toString();

	const stream = fs.createWriteStream(file);

	var p = new Promise(function (done, fail) {
		stream.on('finish', done);
		stream.on('error', fail);
	});

	if (jsdocTypedefs) {
		Object.keys(schemas).forEach(function (name) {
			stream.write(`/** @typedef {${ajvToJsDoc(schemas[name])}} ${name} */\n`);
		});
	}

	if (!jsdocRefs) {
		schemas = {};
	}

	stream.write(
		mainTpl
			.replace(
				`Api.baseUrl = ''`,
				`Api.baseUrl = ${JSON.stringify(baseUrl)}`
			)
			.replace(
				`Api.endpoints = []`,
				`Api.endpoints = ${JSON.stringify(endpoints)}`
			)
	);

	var ns = {};

	endpoints.forEach(function (endpoint, n) {
		var {parts} = endpoint.call;
		var root = ns;
		var last = parts.length - 1;

		parts.forEach(function (prop, i) {
			if (!root.hasOwnProperty(prop)) {
				root[prop] = i === last ? 'endpoint-' + n : {};
			}

			root = root[prop];
		});
	});

	const toString = function (indent, method, tag) {
		var n = tag.match(/\d+$/)[0];
		var e = endpoints[n];

		return methodTpl
			.replace(/^/gm, "\t".repeat(indent))
			.replace(/(:?filepath|function\(\)|Promise<\*>|method =|endpoint)/g, function (tag) {
				var type;

				switch (tag) {
				case 'filepath':
					return e.file + ':' + e.line;

				case 'function()':
					let args = [];

					if (e.params) {
						type = ajvToJsDoc(e.params.schema, schemas);

						if (e.params.names.length === 1) {
							let name = e.params.names[0];
							let prop = e.params.schema.properties[name];

							type = ajvToJsDoc(prop, schemas) + '|' + type;
						}

						args.push(`params: ${type}`);
					}
					else {
						let match = e.url.path.match(/:(\w+)/g);

						if (match) {
							args.push(`params: {${match.map(name => name + `: string`).join(', ')}}`);
						}
					}

					if (e.query) {
						args.push('query: ' + ajvToJsDoc(e.query.schema, schemas));
					}

					if (e.body) {
						args.push('body: ' + ajvToJsDoc(e.body.schema, schemas));
					}

					return `function(${args.join(', ')})`;

				case 'Promise<*>':
					type = '*';

					if (e.response) {
						let res = e.response.find(function ({code}) {
							if (!code) return true;

							return validateCode(200, code);
						});

						if (res) {
							type = ajvToJsDoc(res.schema, schemas);
						}
					}

					return `Promise<${type}>`;

				case 'method =':
					return method;

				case 'endpoint':
					return `Api.endpoints[${n}]`;
				}
			});
	}

	for (var prop in ns) {
		let namespace = ns[prop];

		if (typeof namespace === 'string') {
			stream.write(
				toString(1, `this.${prop} =`, namespace) + ";\n"
			);

			continue;
		}

		namespace = JSON.stringify(namespace, null, "\t").replace(/^/gm, "\t").trim();

		stream.write(
			`\tthis.${prop} = ${namespace};\n`.replace(/^(\t*)("[^"]+":) "(endpoint-\d+)"/gm, function (x, t, method, tag) {
				return toString(t.length, method, tag);
			})
		);
	}

	stream.write(`}\n`);

	stream.end();

	return p;
};

function validateCode(code, schema) {
	return ajv.validate(schema, code);
}
