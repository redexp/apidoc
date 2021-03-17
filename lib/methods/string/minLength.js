const {method, isString, oneArg, firstNumber} = require('../utils');
const set = require('../set');

module.exports = function minLength(schema, args) {
	const methodName = 'minLength';
	method(methodName);
	isString(schema);
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