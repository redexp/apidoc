const {pathToRegexp} = require('path-to-regexp');

const endpoints = [];
const cache = {};

validator.getAjv = function () {
	var {ajv} = validator;

	if (!ajv) {
		const Ajv = require('ajv').default;

		ajv = validator.ajv = new Ajv({coerceTypes: true});

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

function validator(req, res, next) {
	var e = cache[req.url] || endpoints.find(function (e) {
		if (req.method && e.url.method && req.method !== e.url.method) return false;

		if (req.url === e.url.path) {
			cache[req.url] = e;
			return true;
		}

		if (!e.url.regexp) {
			e.url.regexp = pathToRegexp(e.url.path);
		}

		return e.url.regexp.test(req.url);
	});

	if (!e) return;

	var ajv = validator.getAjv();

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
	var {ajv} = validator;

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

module.exports = validator;
module.exports.endpoints = endpoints;
module.exports.ValidationError = ValidationError;
module.exports.RequestValidationError = RequestValidationError;
module.exports.ResponseValidationError = ResponseValidationError;