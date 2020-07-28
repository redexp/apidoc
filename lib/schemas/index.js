const toAst = require('../toAst');

module.exports.getDefaultSchemas = function () {
	var schemas = {
		string: require('./string'),
		number: require('./number'),
		int: require('./int'),
		"date-time": require('./date-time'),
		"date-time-tz": require('./date-time-tz'),
	};

	for (var name in schemas) {
		schemas[name] = toAst(JSON.stringify(schemas[name]));
	}

	return schemas;
};