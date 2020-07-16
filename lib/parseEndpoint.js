const url = require('./annotations/url');

const ANNOTATIONS = {
	url,
};

module.exports = function parseEndpoint(annotations) {
	var endpoint = {};

	annotations.forEach(function (item) {
		var {name, value} = item;

		if (!ANNOTATIONS.hasOwnProperty(name)) {
			throw new Error(`Unknown annotation ${JSON.stringify(name)}`);
		}

		if (name === 'response') {
			if (!endpoint[name]) {
				endpoint[name] = [];
			}

			endpoint[name].push(value);

			return;
		}

		endpoint[name] = ANNOTATIONS[name](value);
	});

	if (endpoint.response) {
		endpoint.response = ANNOTATIONS.response(endpoint.response);
	}

	return endpoint;
};