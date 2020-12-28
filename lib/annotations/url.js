const rule = /^\s*(HEAD|GET|POST|PUT|PATCH|DELETE|CONNECT|OPTIONS|TRACE)?(.+)/i;

module.exports = function (value) {
	var match = rule.exec(value);

	if (!match) {
		throw new Error(`Invalid @url value: ${JSON.stringify(value)}`);
	}

	return {
		method: match[1] && match[1].toUpperCase(),
		path: match[2].trim(),
	};
};