const {readFileSync, createWriteStream} = require('fs');
const {resolve, dirname, relative} = require('path');
const mkdir = require('mkdirp');
const Ajv = require('ajv').default;
const ajv = new Ajv({coerceTypes: true});
const ajvToJsDoc = require('../ajvToJsDoc');
const {ajvToDTs, normalizeName} = ajvToJsDoc;

module.exports = function (
	endpoints,
	outputFile,
	{
		baseUrl = '',
		schemas = {},
		jsdocMethods = true,
		jsdocTypedefs = true,
		jsdocRefs = true,
		dtsFile = '',
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
		if (!/\.[jt]s$/.test(filename)) {
			filename += '.js';
		}

		/**
		 * @type {string}
		 */
		let tpl = readFileSync(resolve(__dirname, '..', 'templates', filename), 'utf-8');

		if (className !== 'Api') {
			tpl = tpl.replace(/\bApi\b/g, className);
		}

		return tpl;
	};

	let mainTpl = getTemplate('api-client');

	if (pathToRegexp) {
		mainTpl = `const {pathToRegexp, compile: createToPath} = require("path-to-regexp");\n` + mainTpl;
	}

	const stream = createWriteStream(outputFile);
	const dtsStream = dtsFile && createWriteStream(dtsFile);
	const dtsParams = {any: 'any'}

	const p = Promise.all([
		new Promise(function (done, fail) {
			stream.on('finish', done);
			stream.on('error', fail);
		}),
		!dtsStream ? Promise.resolve() : new Promise(function (done, fail) {
			dtsStream.on('finish', done);
			dtsStream.on('error', fail);
		})
	]);

	if (jsdocTypedefs) {
		for (let name in schemas) {
			const schema = ajvToJsDoc(schemas[name]);
			name = normalizeName(name);

			stream.write(`/** @typedef {${schema}} ${name} */\n`);
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

	if (dtsStream) {
		dtsStream.write(`interface ${className} {\n`);
	}

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

	let methodTpl = getTemplate('api-client-method');

	if (!jsdocMethods) {
		methodTpl = methodTpl.replace(/\/\*\*.+?\*\/\n/s, '');
	}

	const methodBase = (params) => createMethod({outputDir, endpoints, schemas, ...params});
	const methodJs = (method, tag, indent = 1) => methodBase({tpl: methodTpl, method, tag, indent, generator: ajvToJsDoc});
	const methodDts = (method, tag, indent = 1) => methodBase({tpl: `method = (params) => Promise<*>`, indent, method, tag, generator: ajvToDTs, any: 'any'});

	for (const prop in ns) {
		let namespace = ns[prop];

		if (typeof namespace === 'string') {
			stream.write(
				methodJs(`this.${prop} =`, namespace) + ";\n"
			);

			if (dtsStream) {
				dtsStream.write(
					methodDts(`${prop}: `, namespace) + ",\n"
				);
			}

			continue;
		}

		namespace = JSON.stringify(namespace, null, "\t").replace(/^/gm, "\t").trim();

		stream.write(
			`\tthis.${prop} = ${namespace};\n`.replace(/^(\t*)("[^"]+":) "(endpoint-\d+)"/gm, function (x, t, method, tag) {
				return methodJs(method, tag, t.length);
			})
		);

		if (dtsStream) {
			dtsStream.write(
				`\t${prop}: ${namespace},\n`.replace(/^(\t*)("[^"]+":) "(endpoint-\d+)"/gm, function (x, t, method, tag) {
					return methodDts(method, tag, t.length);
				})
			);
		}
	}

	stream.write(`}\n`);

	if (dtsStream) {
		dtsStream.write(`}\n`);

		for (let name in schemas) {
			const schema = ajvToDTs(schemas[name]);
			name = normalizeName(name);
			const type = schema.charAt(0) === '{' && schema.charAt(schema.length - 1) === '}' ? 'interface' : 'type';
			const eq = type === 'type' ? ' = ' : ' ';

			dtsStream.write(`\n${type} ${name}${eq}${schema}`);
		}

		dtsStream.end();
	}

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

function createMethod({tpl, endpoints, outputDir, indent, method, tag, schemas, generator, any = '*'}) {
	const n = tag.match(/\d+$/)[0];
	const e = endpoints[n];
	const jsDoc = (schema) => generator(schema, {schemas, any});


	return tpl
	.replace(/^/gm, "\t".repeat(indent))
	.replace(/(:?filepath|function\(params\)|\(params\) =>|Promise<\*>|method =|endpoint)/g, function (tag) {
		var type;

		switch (tag) {
		case 'filepath':
			if (!e.file) return '';

			return relative(outputDir, e.file) + (e.line ? ':' + e.line : '');

		case 'function(params)':
		case '(params) =>':
			let args = [];

			if (e.params) {
				type = jsDoc(e.params.schema);

				if (e.params.names.length === 1) {
					let name = e.params.names[0];
					let prop = e.params.schema.properties[name];

					type = jsDoc(prop) + '|' + type;
				}

				args.push(`params: ${type}`);
			}
			else {
				let params = e.url.path.match(/:[\w-]+/g);

				if (params) {
					params = params.map(name => name.slice(1));

					params = jsDoc({
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
				args.push('query: ' + jsDoc(e.query.schema));
			}

			if (e.body) {
				args.push('body: ' + jsDoc(e.body.schema));
			}

			args.push(`meta?: any`);

			return tag.replace('params', args.join(', '));

		case 'Promise<*>':
			type = any;

			if (e.response) {
				let res = e.response.find(function ({code}) {
					if (!code) return true;

					return validateCode(200, code);
				});

				if (res) {
					type = jsDoc(res.schema);
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