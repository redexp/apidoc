
function createRequest(context, e) {
//pathToRegexp
	return async function () {
		let args = Array.from(arguments);
		const ajv = Api.getAjv();
		const errorHandler = context.errorHandler || Api.errorHandler;

		let params = null;
		let query = null;
		let data = null;
		let meta = null;

		if (e.url.params && e.url.params.length > 0) {
			if (typeof args[0] === 'object') {
				params = args.shift();
			}
			else {
				params = {};

				e.url.params.forEach(function ({name}, i) {
					params[name] = args[i];
				});

				args = args.slice(e.url.params.length);
			}
		}

		if (e.query) {
			query = args.shift();
		}

		if (e.body) {
			data = args.shift();
		}

		if (args.length > 0) {
			meta = args[0];
		}

		if (e.params) {
			let {schema, validate} = e.params;

			if (!validate) {
				validate = e.params.validate = ajv.compile(schema);
			}

			if (!validate(params)) {
				errorHandler(new RequestValidationError(
					`Invalid URL params`,
					e,
					'params',
					params,
					validate.errors
				));
			}
		}

		if (e.query) {
			let {schema, validate} = e.query;

			if (!validate) {
				validate = e.query.validate = ajv.compile(schema);
			}

			if (!validate(query)) {
				errorHandler(new RequestValidationError(
					`Invalid URL query`,
					e,
					'query',
					query,
					validate.errors
				));
			}
		}

		if (e.body) {
			let {schema, validate} = e.body;

			if (!validate) {
				validate = e.body.validate = ajv.compile(schema);
			}

			if (!validate(data)) {
				errorHandler(new RequestValidationError(
					`Invalid request body`,
					e,
					'body',
					data,
					validate.errors
				));
			}
		}

		const url = (e.baseUrl || '') + (e.url.toPath ? e.url.toPath(params) : e.url.path);

		const res = await Api.request({
			method: e.url.method,
			url,
			params,
			query,
			body: data,
			endpoint: e,
			context,
			meta,
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
					errorHandler(new ResponseValidationError(
						`Invalid response body`,
						e,
						response,
						body,
						validate.errors
					));
				}
			}
		}

		if (statusCode >= 300) {
			throw res;
		}

		return body;
	};
}
