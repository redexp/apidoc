const nameRule = /^\s*([\w.]+)\s*=/;

module.exports = function (data) {
	return data;
};

module.exports.prepare = function (text) {
	var name = nameRule.exec(text);

	if (!name) {
		throw new Error('@schema OBJECT_NAME required');
	}

	return {
		name: name[1],
		schema: text
	};
};