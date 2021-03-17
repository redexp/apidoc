const t = require('@babel/types');
const cloneDeep = require('lodash/cloneDeep');
const {getPropName, replaceProp} = require('../object');
const {method, objectOrTwo} = require('./utils');

module.exports = function set(schema, args, {methodName = 'set', createNew = true, convertValue = false, valueType} = {}) {
	method(methodName);
	objectOrTwo(args);

	var [first, second] = args;

	if (args.length === 1) {
		args = first.properties.map(prop => [getPropName(prop), prop.value]);
	}
	else {
		if (t.isStringLiteral(first)) {
			first = first.value;
		}

		args = [[first, second]];
	}

	const {astToAjvSchema} = require('../parseSchema');

	if (createNew) {
		schema = cloneDeep(schema);
	}

	args.forEach(function ([name, value]) {
		if (convertValue || t.isCallExpression(value)) {
			if (typeof convertValue === 'function') {
				value = convertValue(value);
			}
			else {
				value = astToAjvSchema(value);
			}
		}

		if (valueType) {
			valueType(value);
		}

		replaceProp(
			schema,
			t.objectProperty(
				t.stringLiteral(name),
				value
			)
		);
	});

	return schema;
};