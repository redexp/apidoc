const {method, isNumber, oneArg, firstNumber} = require('../utils');
const set = require('../set');

module.exports = function exclusiveMaximum(schema, args) {
	const methodName = 'exclusiveMaximum';
	method(methodName);
	isNumber(schema);
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