const toAst = require('../toAst');

module.exports.getDefaults = getDefaults;
module.exports.getDefaultSchemas = getDefaultSchemas;

function getDefaults() {
	return {
		null: require('./null'),
		object: require('./object'),
		string: require('./string'),
		number: require('./number'),
		int: require('./int'),
		positive: require('./positive'),
		negative: require('./negative'),
		id: require('./id'),
		boolean: require('./boolean'),
		date: require('./date'),
		time: require('./time'),
		"date-time": require('./date-time'),
		"date-time-tz": require('./date-time-tz'),
		uri: require('./uri'),
		"uri-reference": require('./uri-reference'),
		"uri-template": require('./uri-template'),
		email: require('./email'),
		hostname: require('./hostname'),
		filename: require('./filename'),
		ipv4: require('./ipv4'),
		ipv6: require('./ipv6'),
		regex: require('./regex'),
		uuid: require('./uuid'),
	};
}

function getDefaultSchemas() {
	var schemas = getDefaults();

	for (var name in schemas) {
		schemas[name] = toAst(JSON.stringify(schemas[name]));
	}

	return schemas;
}