const {method, isArray, oneArg, firstBoolean} = require('../utils');
const set = require('../set');

module.exports = function uniqueItems(schema, args) {
	const methodName = 'uniqueItems';
	method(methodName);
	isArray(schema);
	oneArg(args);

	return set(
		schema,
		[methodName, args[0]],
		{
			methodName,
			valueType: firstBoolean,
		}
	);
};