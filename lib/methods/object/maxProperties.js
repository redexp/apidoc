const {method, isObject, oneArg, firstNumber} = require('../utils');
const set = require('../set');

module.exports = function maxProperties(schema, args) {
	const methodName = 'maxProperties';
	method(methodName);
	isObject(schema);
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