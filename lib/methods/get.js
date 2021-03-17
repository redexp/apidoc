const t = require('@babel/types');
const cloneDeep = require('lodash/cloneDeep');
const {getPropValue} = require('../object');

module.exports = function get(schema, args) {
	if (args.length < 1 || args.length > 1) {
		throw new Error('Method "get" required one argument');
	}

	var name = args[0];

	if (!t.isStringLiteral(name)) {
		throw new Error('Method "get" required string argument');
	}

	name = name.value;

	var prop = getPropValue(schema, name);

	if (!prop) {
		throw new Error(`Property ${JSON.stringify(name)} is undefined`);
	}

	return cloneDeep(prop);
};