const ANNOTATIONS = require('./annotations');
const JSDOC = require('./annotations/jsdoc').reduce((o, n) => {o[n] = true; return o;}, {});
const SHORTCUTS = ANNOTATIONS.__shortcuts;

module.exports = function parseEndpoint(annotations, options = {}) {
	var endpoint = {
		namespace: 'default',
		file: options.file,
		line: options.line,
	};

	for (let {name, value} of annotations) {
		if (SHORTCUTS.hasOwnProperty(name)) {
			name = SHORTCUTS[name];
		}

		if (!ANNOTATIONS.hasOwnProperty(name)) {
			if (JSDOC.hasOwnProperty(name)) {
				if (options.includeJsdoc) {
					endpoint[name] = value.trim();
				}

				continue;
			}

			throw new Error(`Unknown annotation ${JSON.stringify(name)}`);
		}

		if (name === 'response' || name === 'schema') {
			if (!endpoint[name]) {
				endpoint[name] = [];
			}

			endpoint[name].push(value);

			continue;
		}

		endpoint[name] = ANNOTATIONS[name](value, options);
	}

	if (endpoint.schema) {
		endpoint.schema = ANNOTATIONS.schema(endpoint.schema, options);
	}

	if (endpoint.response) {
		endpoint.response = ANNOTATIONS.response(endpoint.response, options);
	}

	return endpoint;
};