const {readFileSync, createWriteStream} = require('fs');
const {resolve, dirname, relative} = require('path');
const mkdir = require('mkdirp');
const Ajv = require('ajv').default;
const ajv = new Ajv({coerceTypes: true});
const ajvToJsDoc = require('../ajvToJsDoc');

module.exports = function (
	endpoints,
	outputFile,
	{
		baseUrl = '',
		schemas = {},
		jsdocTypedefs = true,
		jsdocRefs = true,
		pathToRegexp = true,
		className = 'Api',
		requestMethod = true,
		getAjvMethod = true,
		errorHandlerMethod = true,
	} = {}
) {
	const outputDir = dirname(outputFile);

	mkdir.sync(outputDir);

	const getTemplate = function (filename) {
		let tpl = readFileSync(resolve(__dirname, '..', 'templates', filename + '.js'), 'utf-8');

		if (className !== 'Api') {
			tpl = tpl.replace(/\bApi\b/g, className);
		}

		return tpl;
	};

	let mainTpl = getTemplate('api-client');
	const methodTpl = getTemplate('api-client-method');

	if (pathToRegexp) {
		mainTpl = `const {pathToRegexp, compile: createToPath} = require("path-to-regexp");\n` + mainTpl;
	}

	const stream = createWriteStream(outputFile);

	const p = new Promise(function (done, fail) {
		stream.on('finish', done);
		stream.on('error', fail);
	});

	if (jsdocTypedefs) {
		for (const name in schemas) {
			stream.write(`/** @typedef {${ajvToJsDoc(schemas[name])}} ${name} */\n`);
		}
	}

	if (!jsdocRefs) {
		schemas = {};
	}

	const baseUrlHash = {};

	for (let {baseUrl, namespace, file} of endpoints) {
		if (!baseUrl) continue;

		if (baseUrlHash.hasOwnProperty(namespace)) {
			const ns = file && file + '|' + namespace;

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

		const baseUrl = (
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
		.replace(
			`${className}.baseUrl = ''`,
			`${className}.baseUrl = ${JSON.stringify(baseUrl)}`
		)
		.replace(/}[\s\n]*$/, '')
	);

	const ns = {};

	for (let n = 0; n < endpoints.length; n++) {
		const endpoint = endpoints[n];
		const {parts} = endpoint.call;
		const last = parts.length - 1;
		let root = ns;

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
					let params = e.url.path.match(/:[\w-]+/g);

					if (params) {
						params = params.map(name => name.slice(1));

						params = ajvToJsDoc({
							type: 'object',
							required: params,
							properties: params.reduce((props, name) => {
								props[name] = {
									type: 'string',
								};

								return props;
							}, {})
						});

						args.push(`params: ${params}`);
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
				return endpointToJSON(endpoints[n]);
			}
		})
		.replace(/\s+\*\s+@see\s*\n/, "\n");
	}

	for (const prop in ns) {
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

	stream.write(getTemplate('api-classes'));

	stream.write(
		getTemplate('api-createRequest')
		.replace(
			'//pathToRegexp\n',
			!pathToRegexp ? '' : getTemplate('api-createRequest-pathToRegexp')
		)
	);

	if (requestMethod) {
		stream.write(getTemplate('api-request'));
	}

	if (getAjvMethod) {
		stream.write(getTemplate('api-getAjv'));
	}

	if (errorHandlerMethod) {
		stream.write(getTemplate('api-errorHandler'));
	}

	stream.end();

	return p;
};

function validateCode(code, schema) {
	return ajv.validate(schema, code);
}

function endpointToJSON(e) {
	return JSON.stringify(e, function (prop, value) {
		if (
			((prop === 'title' || prop === 'description') && typeof value === 'string') ||
			((prop === 'file' || prop === 'line') && e[prop] === value)
		) {
			return;
		}

		return value;
	});
}