const cloneDeep = require('lodash/cloneDeep');
const {method, oneArg, firstString} = require('./utils');
const {getPropValue} = require('../object');

module.exports = function get(schema, args) {
	method('get');
	oneArg(args);
	firstString(args[0]);

	var name = args[0].value;

	var prop = getPropValue(schema, name);

	if (!prop) {
		throw new Error(`Option ${JSON.stringify(name)} is undefined`);
	}

	return cloneDeep(prop);
};