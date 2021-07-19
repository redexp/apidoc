const fs = require('fs');
const {resolve, dirname, relative} = require('path');
const mkdir = require('mkdirp');
const Ajv = require('ajv').default;
const ajv = new Ajv({coerceTypes: true});
const ajvToJsDoc = require('../ajvToJsDoc');

module.exports = function (endpoints, outputFile, {baseUrl = '', schemas = {}, jsdocTypedefs = true, jsdocRefs = true}) {
	const outputDir = dirname(outputFile);

	mkdir.sync(outputDir);

	const mainTpl = fs.readFileSync(resolve(__dirname, '..', 'templates', 'api-client.js'), 'utf-8');
	const methodTpl = fs.readFileSync(resolve(__dirname, '..', 'templates', 'api-client-method.js'), 'utf-8');

	const stream = fs.createWriteStream(outputFile);

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

	var baseUrlHash = {};

	for (let {baseUrl, namespace, file} of endpoints) {
		if (!baseUrl) continue;

		if (baseUrlHash.hasOwnProperty(namespace)) {
			let ns = file && file + '|' + namespace;

			if (ns && !baseUrlHash.hasOwnProperty(ns)) {
				baseUrlHash[ns] = baseUrl;
				continue;
			}

			throw new Error(`Duplicate baseUrl ${JSON.stringify(baseUrl)}`);
		}

		baseUrlHash[namespace] = baseUrl;
	}

	if (baseUrl) {
		baseUrlHash['default'] = baseUrl;
	}

	for (let e of endpoints) {
		if (e.baseUrl) continue;

		let baseUrl = (
			(e.file && baseUrlHash[e.file + '|' + e.namespace]) ||
			(e.namespace !== 'default' && baseUrlHash[e.namespace])
		);

		if (baseUrl) {
			e.baseUrl = baseUrl;
		}
	}

	endpoints = endpoints.filter(e => !!e.call);

	stream.write(
		mainTpl
			.replace(/}[\s\n]*$/, '')
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

	for (let n = 0; n < endpoints.length; n++) {
		let endpoint = endpoints[n];
		let {parts} = endpoint.call;
		let root = ns;
		let last = parts.length - 1;

		parts.forEach(function (prop, i) {
			if (!root.hasOwnProperty(prop)) {
				root[prop] = i === last ? 'endpoint-' + n : {};
			}

			root = root[prop];
		});
	}

	const toString = function (indent, method, tag) {
		var n = tag.match(/\d+$/)[0];
		var e = endpoints[n];

		return methodTpl
			.replace(/^/gm, "\t".repeat(indent))
			.replace(/(:?filepath|function\(\)|Promise<\*>|method =|endpoint)/g, function (tag) {
				var type;

				switch (tag) {
				case 'filepath':
					if (!e.file) return '';

					return relative(outputDir, e.file) + (e.line ? ':' + e.line : '');

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

					args.push(`meta?: any`);

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
			})
			.replace(/\s+\*\s+@see\s*\n/, "\n");
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
