const fs = require('fs');
const {resolve, dirname} = require('path');
const mkdir = require('mkdirp');
const pick = require('lodash/pick');
const Ajv = require('ajv').default;
const ajv = new Ajv({coerceTypes: true});

module.exports = function (file, {baseUrl = '', endpoints}) {
	mkdir.sync(dirname(file));

	const mainTpl = fs.readFileSync(resolve(__dirname, '..', 'templates', 'api-client.js')).toString();
	const methodTpl = fs.readFileSync(resolve(__dirname, '..', 'templates', 'api-client-method.js')).toString();

	const stream = fs.createWriteStream(file);

	var p = new Promise(function (done, fail) {
		stream.on('finish', done);
		stream.on('error', fail);
	});

	stream.write(
		mainTpl
			.replace(`baseUrl = ''`, `baseUrl = ${JSON.stringify(baseUrl)}`)
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
						type = schemaToJsDocType(e.params.schema);

						if (e.params.names.length === 1) {
							let name = e.params.names[0];
							let prop = e.params.schema.properties[name];

							type = schemaToJsDocType(prop) + '|' + type;
						}

						args.push(`params: ${type}`);
					}

					if (e.query) {
						args.push('query: ' + schemaToJsDocType(e.query.schema));
					}

					if (e.body) {
						args.push('body: ' + schemaToJsDocType(e.body.schema));
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
							type = schemaToJsDocType(res.schema);
						}
					}

					return `Promise<${type}>`;

				case 'method =':
					return method;

				case 'endpoint':
					return JSON.stringify(pick(e, 'url', 'params', 'query', 'body', 'response'));
				}
			});
	}

	for (var prop in ns) {
		let namespace = ns[prop];

		if (typeof namespace === 'string') {
			stream.write(
				toString(0, `Api.prototype.${prop} =`, namespace) + ";\n"
			);

			continue;
		}

		namespace = JSON.stringify(namespace, null, "\t");

		stream.write(
			`Api.prototype.${prop} = ${namespace};\n`.replace(/^(\t*)("[^"]+":) "(endpoint-\d+)"/gm, function (x, t, method, tag) {
				return toString(t.length, method, tag);
			})
		);
	}

	stream.end();

	return p;
};

function validateCode(code, schema) {
	return ajv.validate(schema, code);
}

function schemaToJsDocType(schema) {
	var {type} = schema;

	if (type === 'string' || type === 'number' || type === 'boolean') {
		return type;
	}

	if (type === 'integer') {
		return 'number';
	}

	if (Array.isArray(type)) {
		return type.map(schemaToJsDocType).join('|');
	}

	if (type === 'array') {
		if (!schema.items) {
			return 'Array';
		}

		return `Array<${schemaToJsDocType(schema.items)}>`;
	}

	if (type === 'object') {
		let props = schema.properties;

		if (!props) {
			return 'Object';
		}

		var req = schema.required || [];

		props = Object.keys(props).map(function (prop) {
			return `"${prop}"${req.includes(prop) ? '' : '?'}: ${schemaToJsDocType(props[prop])}`;
		});

		return `{${props.join(', ')}}`;
	}

	if (schema.anyOf) {
		return schema.anyOf.map(schemaToJsDocType).join('|');
	}

	return '*'
}