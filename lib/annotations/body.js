const getSchemaDescription = require('../getSchemaDescription');

module.exports = function (data) {
	return data;
};

module.exports.prepare = function (text) {
	var [schema, description] = getSchemaDescription(text);

	return {
		description,
		schema,
	};
};