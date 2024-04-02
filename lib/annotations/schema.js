module.exports = function (data) {
	return data;
};

module.exports.prepare = function (schema) {
	let name, local = false;

	if (typeof schema === 'string') {
		name = /^\s*(const\s+|let\s+|var\s+)?([$\w.]+)\s*=/.exec(schema);
		local = !!(name && name[1]);

		if (local) {
			schema = schema.replace(name[1], '');
		}

		name = name && name[2];
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
		local,
		name,
		schema,
	};
};