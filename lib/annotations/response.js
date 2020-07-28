const rule = /^\s*(\d{3})?\s*(.+)/s;

module.exports = function (list) {
	return list;
};

module.exports.prepare = function (value) {
	var match = rule.exec(value);

	if (!match) {
		throw new Error(`Invalid @response value: ${JSON.stringify(value)}`);
	}

	var code = match[1] ? Number(match[1]) : 200;
	var schema = match[2];

	return {
		code,
		schema,
	};
};