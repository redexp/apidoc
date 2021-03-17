const {method, isArray, oneArg, firstNumber} = require('../utils');
const set = require('../set');

module.exports = function maxContains(schema, args) {
	const methodName = 'maxContains';
	method(methodName);
	isArray(schema);
	oneArg(args);

	return set(
		schema,
		[methodName, args[0]],
		{
			methodName,
			valueType: firstNumber,
		}
	);
};