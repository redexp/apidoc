const t = require('@babel/types');
const clone = require('lodash/clone');
const {method, getMethodName, isObject, oneArg, firstObject} = require('../utils');
const set = require('../set');

module.exports = function patternProperties(schema, args) {
	const methodName = 'patternProperties';
	method(methodName);
	isObject(schema);
	oneArg(args);

	return set(
		schema,
		[methodName, args[0]],
		{
			methodName,
			convertValue: convertProperties,
			valueType: firstObject,
		}
	);
};

module.exports.convertProperties = convertProperties;

function convertProperties(value) {
	const {astToAjvSchema} = require('../../parseSchema');

	if (t.isCallExpression(value)) {
		value = astToAjvSchema(value);
		firstObject(value);
		return value;
	}

	firstObject(value);

	value = clone(value);
	value.properties = value.properties.map(function (prop) {
		if (!t.isObjectProperty(prop)) {
			throw new Error(`Method "${getMethodName()}" invalid object property type: ${prop.type}`);
		}

		prop = clone(prop);

		prop.value = astToAjvSchema(prop.value);

		return prop;
	});

	return value;
}