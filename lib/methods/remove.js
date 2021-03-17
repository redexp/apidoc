const t = require('@babel/types');
const clone = require('lodash/clone');
const cloneDeep = require('lodash/cloneDeep');
const {getProp, getPropStringValue, getPropName, replaceProp} = require('../object');

module.exports = function remove(schema, args, params = {}) {
	var {methodName = 'remove'} = params;

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
	var properties = getProp(schema, 'properties');

	if (type !== 'object') {
		throw new Error(`Method "${methodName}" allowed only for "object"`);
	}

	schema = clone(schema);
	schema.properties = clone(schema.properties);

	schema.properties.forEach(function (prop, i) {
		if (prop === required || prop === properties) return;

		schema.properties[i] = cloneDeep(prop);
	});

	if (required) {
		required = clone(required);

		required.value.elements = required.value.elements.filter(function (item) {
			return !args.includes(item.value);
		});

		replaceProp(schema, required);
	}

	if (properties) {
		properties = clone(properties);

		properties.value.properties = properties.value.properties.filter(function (prop) {
			return !args.includes(getPropName(prop));
		});

		replaceProp(schema, properties);
	}

	return schema;
};