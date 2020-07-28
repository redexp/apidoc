module.exports = function (data) {
	var names = Object.keys(data.schema.properties);

	return {
		...data,
		names,
	};
};

module.exports.prepare = function (text) {
	return {
		schema: text
	};
};