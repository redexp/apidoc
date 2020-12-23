const {pathToRegexp} = require('path-to-regexp');
const mung = require('express-mung');
const Ajv = require('ajv');
const ajv = new Ajv({coerceTypes: true});

const endpoints = [];

module.exports = function (req, res, next) {
	for (var i = 0, len = endpoints.length; i < len; i++) {
		var e = endpoints[i];

		if (!e.regexp) {
			e.url.regexp = pathToRegexp(e.url.path);
		}

		if (req.method !== e.url.method || !e.url.regexp.test(req.originalUrl)) continue;

		req.endpoint = e;

		if (e.params) {
			let {schema, validate} = e.params;

			if (!validate) {
				validate = e.params.validate = ajv.compile(schema);
			}

			if (!validate(req.params)) {
				return next({message: `Invalid URL params`, errors: formatErrors('request.params', validate.errors)});
			}
		}

		if (e.query) {
			let {schema, validate} = e.query;

			if (!validate) {
				validate = e.query.validate = ajv.compile(schema);
			}

			if (!validate(req.query)) {
				return next({message: `Invalid URL query`, errors: formatErrors('request.query', validate.errors)});
			}
		}

		if (e.body) {
			let {schema, validate} = e.body;

			if (!validate) {
				validate = e.body.validate = ajv.compile(schema);
			}

			if (!validate(req.body)) {
				return next({message: `Invalid request body`, errors: formatErrors('request.body', validate.errors)});
			}
		}

		if (e.response && e.response.length > 0) {
			return onResponse(req, res, next);
		}

		return next();
	}
};

const onResponse = mung.json(function (body, req, res) {
	const e = req.endpoint;

	for (let i = 0, len = e.response.length; i < len; i++) {
		let response = e.response[i];
		let {code, schema, validate, validateCode} = response;

		if (code && !validateCode) {
			validateCode = response.validateCode = ajv.compile(code);
		}

		if (validateCode && !validateCode(res.statusCode)) {
			continue;
		}

		if (!validate) {
			validate = response.validate = ajv.compile(schema);
		}

		if (!validate(body)) {
			return {
				message: `Invalid response body`,
				errors: formatErrors('response.body', validate.errors)
			};
		}
	}

	return body;
}, {mungError: true});

function formatErrors(path, errors) {
	return errors.map(err => path + err.dataPath + ' ' + err.message)
}