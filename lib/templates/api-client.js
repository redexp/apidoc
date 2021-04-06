const {pathToRegexp, compile: createToPath} = require('path-to-regexp');

module.exports = Api;

Api.baseUrl = '';

Api.endpoints = [];

Api.getAjv = function () {
	var {ajv} = Api;

	if (!ajv) {
		const Ajv = require('ajv').default;

		ajv = Api.ajv = new Ajv({coerceTypes: true});

		try {
			var formatsFound = !!require.resolve('ajv-formats');
		}
		catch (err) {}

		if (formatsFound) {
			require('ajv-formats')(ajv);
		}
	}

	return ajv;
};

/**
 * @param {{method: string, url: string, query?: Object, params?: Object, body?: any, endpoint: Object, context: Api}} params
 * @returns {Promise<{statusCode: number, body?: any}>}
 */
Api.request = function ajax({method, url, query, body, context}) {
	const r = require('request');

	if (!context.requestCookieJar) {
		context.requestCookieJar = r.jar();
	}

	return new Promise(function (done, fail) {
		r({
			method,
			url: context.baseUrl + url,
			qs: query,
			json: true,
			jar: context.requestCookieJar,
			body,
		}, function (err, res) {
			if (err) {
				fail(err);
			}
			else {
				done(res);
			}
		});
	});
};

function createRequest(context, e) {
	e.url.params = [];
	e.url.regexp = pathToRegexp(
		e.url.path,
		e.url.params
	);
	e.url.toPath = createToPath(
		e.url.path
	);

	return async function () {
		var args = Array.from(arguments);

		const ajv = Api.getAjv();

		var params = {};
		var query = {};
		var data = {};

		if (e.url.params.length > 0) {
			if (typeof args[0] === 'object') {
				params = args[0];
				args = args.slice(1);
			}
			else {
				e.url.params.forEach(function ({name}, i) {
					params[name] = args[i];
				});

				args = args.slice(e.url.params.length);
			}
		}

		if (e.query) {
			query = args[0];
			args = args.slice(1);
		}

		if (e.body) {
			data = args[0];
		}

		if (e.params) {
			let {schema, validate} = e.params;

			if (!validate) {
				validate = e.params.validate = ajv.compile(schema);
			}

			if (!validate(params)) {
				throw new RequestValidationError(`Invalid URL params`, 'params', validate.errors);
			}
		}

		if (e.query) {
			let {schema, validate} = e.query;

			if (!validate) {
				validate = e.query.validate = ajv.compile(schema);
			}

			if (!validate(query)) {
				throw new RequestValidationError(`Invalid URL query`, 'query', validate.errors);
			}
		}

		if (e.body) {
			let {schema, validate} = e.body;

			if (!validate) {
				validate = e.body.validate = ajv.compile(schema);
			}

			if (!validate(data)) {
				throw new RequestValidationError(`Invalid request body`, 'body', validate.errors);
			}
		}

		const url = e.url.toPath(params);

		const res = await Api.request({
			method: e.url.method,
			url,
			params,
			query,
			body: data,
			endpoint: e,
			context,
		});

		const {statusCode, body} = res;

		if (e.response) {
			for (let i = 0, len = e.response.length; i < len; i++) {
				let response = e.response[i];
				let {code, schema, validate, validateCode} = response;

				if (code && statusCode && !validateCode) {
					validateCode = response.validateCode = ajv.compile(code);
				}

				if (validateCode && !validateCode(statusCode)) {
					continue;
				}

				if (!validate) {
					validate = response.validate = ajv.compile(schema);
				}

				if (!validate(body)) {
					throw new ResponseValidationError(`Invalid response body`, validate.errors);
				}
			}
		}

		if (statusCode >= 300) {
			throw res;
		}

		return body;
	};
}

class ValidationError extends Error {
	constructor(message, errors) {
		super(message);

		this.name = "ValidationError";
		this.errors = errors;
	}
}

class RequestValidationError extends ValidationError {
	constructor(message, prop, errors) {
		super(message, errors);

		this.name = "RequestValidationError";
		this.property = prop;
	}
}

class ResponseValidationError extends ValidationError {
	constructor(message, errors) {
		super(message, errors);

		this.name = "ResponseValidationError";
	}
}

Api.ValidationError = ValidationError;
Api.RequestValidationError = RequestValidationError;
Api.ResponseValidationError = ResponseValidationError;

function Api(baseUrl = Api.baseUrl) {
	this.baseUrl = baseUrl;
