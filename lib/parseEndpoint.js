const ANNOTATIONS = require('./annotations');
const SHORTCUTS = ANNOTATIONS.__shortcuts;

module.exports = function parseEndpoint(annotations) {
	var endpoint = {
		namespace: 'default'
	};

	annotations.forEach(function (item) {
		var {name, value} = item;

		if (SHORTCUTS.hasOwnProperty(name)) {
			name = SHORTCUTS[name];
		}

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