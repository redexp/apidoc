module.exports = function (data) {
	const names = Object.keys(data.schema.properties);

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