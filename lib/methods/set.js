const t = require('@babel/types');
const cloneDeep = require('lodash/cloneDeep');
const {getPropName, replaceProp} = require('../object');

module.exports = function set(schema, args, params = {}) {
	var {createNew = true} = params;

	if (args.length === 0) {
		throw new Error('Method "set" required at least one argument');
	}

	if (args.length > 2) {
		throw new Error('Method "set" accept only two arguments');
	}

	var [first, second] = args;

	if (args.length === 1) {
		if (!t.isObjectExpression(first)) {
			if (t.isStringLiteral(first)) {
				throw new Error('Method "set" required two arguments');
			}
			else {
				throw new Error('Method "set" required first argument to be object');
			}
		}

		args = first.properties.map(prop => [getPropName(prop), prop.value]);
	}
	else {
		if (!t.isStringLiteral(first)) {
			throw new Error('Method "set" required first argument to be string');
		}

		args = [[first.value, second]];
	}

	const {astToAjvSchema} = require('../parseSchema');

	if (createNew) {
		schema = cloneDeep(schema);
	}

	args.forEach(function ([name, value]) {
		if (t.isCallExpression(value)) {
			value = astToAjvSchema(value);
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