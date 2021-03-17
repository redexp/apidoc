const t = require('@babel/types');
const cloneDeep = require('lodash/cloneDeep');
const {getPropValue, getPropStringValue} = require('../object');

module.exports = function prop(schema, args) {
	if (args.length < 1 || args.length > 1) {
		throw new Error('Method "prop" required one argument');
	}

	if (getPropStringValue(schema, 'type') !== 'object') {
		throw new Error('Method "prop" required "object" schema');
	}

	var props = getPropValue(schema, 'properties');

	if (!props) {
		throw new Error('Invalid "object" schema, "properties" undefined');
	}

	var name = args[0];

	if (!t.isStringLiteral(name)) {
		throw new Error('Method "prop" required string argument');
	}

	name = name.value;

	var prop = getPropValue(props, name);

	if (!prop) {
		throw new Error(`Property ${JSON.stringify(name)} is undefined`);
	}

	return cloneDeep(prop);
};