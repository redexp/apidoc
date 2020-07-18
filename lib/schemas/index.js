const schemas = module.exports = {
	asString: {},

	asAst: {},

	setString(name, value) {
		if (typeof name === 'object') {
			for (let key in name) {
				schemas.setString(key, name[key]);
			}

			return;
		}

		if (typeof value !== 'string') {
			value = JSON.stringify(value);
		}

		schemas.asString[name] = value;

		delete schemas.asAst[name];
	},

	getString(name) {
		return (
			schemas.asString.hasOwnProperty(name) ?
				schemas.asString[name]
				:
				undefined
		);
	},

	setAst(name, value) {
		schemas.asAst[name] = value;
	},

	getAst(name) {
		return (
			schemas.asAst.hasOwnProperty(name) ?
				schemas.asAst[name]
				:
				undefined
		);
	},

	clear() {
		schemas.asString = {};
		schemas.asAst = {};
	},

	reset() {
		schemas.clear();

		schemas.setString({
			string: require('./string'),
			number: require('./number'),
			int: require('./int'),
			"date-time": require('./date-time'),
			"date-time-tz": require('./date-time-tz'),
		});
	}
};

schemas.reset();