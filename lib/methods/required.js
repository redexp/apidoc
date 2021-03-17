const t = require('@babel/types');
const cloneDeep = require('lodash/cloneDeep');
const {getProp, getPropStringValue, replaceProp} = require('../object');
const {push, remove} = require('../array');

module.exports = function required(schema, args, params = {}) {
	var {methodName = 'required', add = true} = params;

	if (args.length === 0) {
		throw new Error(`Method "${methodName}" required at least one argument`);
	}

	args = args.map(function (s) {
		if (!t.isStringLiteral(s)) {
			throw new Error(`Method "${methodName}" accept only strings`);
		}

		return s.value;
	});

	var type = getPropStringValue(schema, 'type');
	var required = getProp(schema, 'required');

	if (type !== 'object') {
		throw new Error(`Method "${methodName}" allowed only for "object"`);
	}

	schema = cloneDeep(schema);

	required = required ? required.value.elements.map(s => s.value) : [];

	args.forEach(function (name) {
		if (add) {
			push(required, name);
		}
		else {
			remove(required, name);
		}
	});

	replaceProp(
		schema,
		t.objectProperty(
			t.stringLiteral('required'),
			t.arrayExpression(required.map(s => t.stringLiteral(s)))
		)
	);

	return schema;
};