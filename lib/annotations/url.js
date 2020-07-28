const rule = /^\s*(\w+)\s+(.+)/;

module.exports = function (value) {
	var match = rule.exec(value);

	if (!match) {
		throw new Error(`Invalid @url value: ${JSON.stringify(value)}`);
	}

	return {
		method: match[1].toUpperCase(),
		path: match[2],
	};
};