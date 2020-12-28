const {pathToRegexp} = require('path-to-regexp');
const Ajv = require('ajv');
const ajv = new Ajv({coerceTypes: true});

const endpoints = [];

function validator(req, res, next) {
	for (var i = 0, len = endpoints.length; i < len; i++) {
		var e = endpoints[i];

		if (!e.regexp) {
			e.url.regexp = pathToRegexp(e.url.path);
		}

		if ((req.method && req.method !== e.url.method) || !e.url.regexp.test(req.url)) continue;

		if (e.params) {
			let {schema, validate} = e.params;

			if (!validate) {
				validate = e.params.validate = ajv.compile(schema);
			}

			if (!validate(req.params)) {
				throw new RequestValidationError(`Invalid URL params`, 'params', validate.errors);
			}
		}

		if (e.query) {
			let {schema, validate} = e.query;

			if (!validate) {
				validate = e.query.validate = ajv.compile(schema);
			}

			if (!validate(req.query)) {
				throw new RequestValidationError(`Invalid URL query`, 'query', validate.errors);
			}
		}

		if (e.body) {
			let {schema, validate} = e.body;

			if (!validate) {
				validate = e.body.validate = ajv.compile(schema);
			}

			if (!validate(req.body)) {
				throw new RequestValidationError(`Invalid request body`, 'body', validate.errors);
			}
		}

		if (e.response && e.response.length > 0) {
			return onResponse(e, res, next);
		}

		if (next) {
			next();
		}

		return;
	}
}

function onResponse(e, res, next) {
	if (!res) {
		return function validateResponse(data) {
			validateJsonData(e, data);
		};
	}
	
	const originalJson = res.json;

	res.json = function jsonHook(data) {
		res.json = originalJson;

		if (res.headersSent) return res;

		validateJsonData(e, data, res.statusCode);

		return originalJson.call(res, data);
	};
	
	if (next) {
		next();
	}
}

function validateJsonData(e, body, statusCode) {
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

class RequestValidationError extends Error {
	constructor(message, prop, errors) {
		super(message);

		this.name = "RequestValidationError";
		this.property = prop;
		this.errors = errors;
	}
}

class ResponseValidationError extends Error {
	constructor(message, errors) {
		super(message);

		this.name = "ResponseValidationError";

		this.errors = errors;
	}
}

module.exports = validator;
module.exports.endpoints = endpoints;
module.exports.RequestValidationError = RequestValidationError;
module.exports.ResponseValidationError = ResponseValidationError;