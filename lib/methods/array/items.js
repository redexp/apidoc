const t = require('@babel/types');
const {method, isArray, oneArg} = require('../utils');
const set = require('../set');

module.exports = function items(schema, args, params = {}) {
	const methodName = 'items';
	method(methodName);
	isArray(schema);
	oneArg(args);

	return set(
		schema,
		[methodName, args[0]],
		{
			methodName,
			convertValue: convertArray,
			...params,
		}
	);
};

function convertArray(value) {
	const {astToAjvSchema} = require('../../parseSchema');

	if (t.isArrayExpression(value)) {
		value = {...value};
		value.elements = value.elements.map(astToAjvSchema);
	}
	else {
		value = astToAjvSchema(value);
	}

	return value;
}