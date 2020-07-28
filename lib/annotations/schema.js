module.exports = function (data) {
	return data;
};

module.exports.prepare = function (text) {
	return {
		schema: text
	};
};