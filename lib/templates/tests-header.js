const ajax = require('axios');
const Ajv = require('ajv');
const {pathToRegexp, compile: createToPath} = require('path-to-regexp');
const ajv = new Ajv();
const HOST = host;

/**
 * @param endpoint
 * @returns {Function}
 */
function createTestRequest(endpoint) {
	endpoint.url.params = [];
	endpoint.url.regexp = pathToRegexp(
		endpoint.url.path,
		endpoint.url.params
	);
	endpoint.url.toPath = createToPath(
		endpoint.url.path
	);

	return async function () {
		const args = arguments;

		if (args.length !== endpoint.call.params.length + (endpoint.body ? 1 : 0)) {
			throw new Error(`Invalid arguments number. Expect ${endpoint.call.params.length + (endpoint.body ? ' + 1 (for body)' : '')}, but got ${args.length}`);
		}

		const params = {};

		endpoint.url.params.forEach(function (name) {
			var index = endpoint.call.params.indexOf(name);
			params[name] = args[index];
		});

		if (endpoint.params) {
			let {schema, validate} = endpoint.params;

			if (!validate) {
				validate = endpoint.params.validate = ajv.compile(schema);
			}

			if (!validate(params)) {
				throw {message: `Invalid URL params`, errors: validate.errors};
			}
		}

		const query = {};

		if (endpoint.query) {
			let {schema, names, validate} = endpoint.query;

			names.forEach(function (name) {
				var index = endpoint.call.params.indexOf(name);
				query[name] = args[index];
			});

			if (!validate) {
				validate = endpoint.query.validate = ajv.compile(schema);
			}

			if (!validate(query)) {
				throw {message: `Invalid URL query`, errors: validate.errors};
			}
		}

		var body;

		if (endpoint.body) {
			body = args[args.length - 1];

			let {schema, validate} = endpoint.body;

			if (!validate) {
				validate = endpoint.body.validate = ajv.compile(schema);
			}

			if (!validate(body)) {
				throw {message: `Invalid body`, errors: validate.errors};
			}
		}

		const url = endpoint.url.toPath(params);

		const res = await ajax({
			url,
			baseURL: HOST,
			method: endpoint.url.method,
			params: query,
			data: body,
		});

		if (!endpoint.response) return res.data;

		var item = endpoint.response.find(item => item.code === res.status);

		if (!item) {
			throw new Error(`Unknown response code: ${res.status}`);
		}

		let {schema, validate} = item;

		if (!validate) {
			validate = item.validate = ajv.compile(schema);
		}

		let resBody = res.data;

		if (typeof resBody === 'string') {
			try {
				resBody = JSON.parse(resBody);
			}
			catch (e) {
				throw new Error(`Invalid response body JSON: ${resBody}`);
			}
		}

		if (!validate(resBody)) {
			throw {message: `Invalid response ${item.code}`, errors: validate.errors};
		}

		return res.data;
	};
}

module.exports = namespaces;

