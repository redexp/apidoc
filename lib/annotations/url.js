const {pathToRegexp} = require('path-to-regexp');
const rule = /^\s*(\w+)\s+(.+)/;

module.exports = function (value) {
	var match = rule.exec(value);

	if (!match) {
		throw new Error(`Invalid @url value ${JSON.stringify(value)}`);
	}

	var path = match[2];
	var params = [];
	var regexp = pathToRegexp(path, params);

	return {
		method: match[1],
		path,
		regexp,
		params,
	};
};