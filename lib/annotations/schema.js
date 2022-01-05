module.exports = function (data) {
	return data;
};

module.exports.prepare = function (schema) {
	var name;

	if (typeof schema === 'string') {
		name = /^\s*([\w.]+)\s*=/.exec(schema);
		name = name && name[1];
	}
	else if (typeof schema === 'function') {
		const {getAstSchema} = require('adv-parser');
		const schemas = {};
		getAstSchema(schema, {schemas});
		name = Object.keys(schemas)[0];
	}

	if (!name) {
		throw new Error('@schema OBJECT_NAME required');
	}

	return {
		name,
		schema,
	};
};