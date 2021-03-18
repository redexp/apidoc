const t = require('@babel/types');
const cloneDeep = require('lodash/cloneDeep');
const {method, isObject, atLeastOne, onlyStrings} = require('../utils');
const set = require('../set');
const {getProp, replaceProp} = require('../../object');
const {push, remove} = require('../../array');

module.exports = function required(schema, args, {methodName = 'required', add = true, clone = true} = {}) {
	method(methodName);
	isObject(schema);
	atLeastOne(args);

	if (args.length === 1 && !t.isStringLiteral(args[0])) {
		let valueType = value => {
			if (!t.isArrayExpression(value)) {
				throw new Error(`Method "${methodName}" required array`);
			}

			value.elements.forEach(function (item) {
				if (!t.isStringLiteral(item)) {
					throw new Error(`Method "${methodName}" required array of strings`);
				}
			});
		}

		return set(schema, ['required', args[0]], {methodName, valueType, clone});
	}

	onlyStrings(args);

	args = args.map(s => s.value);

	var required = getProp(schema, 'required');

	if (clone) {
		schema = cloneDeep(schema);
	}

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