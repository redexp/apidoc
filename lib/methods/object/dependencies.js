const dependentRequired = require('./dependentRequired');

module.exports = function dependencies(schema, args) {
	return dependentRequired(schema, args, {methodName: 'dependencies'});
};