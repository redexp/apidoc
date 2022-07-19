
Api.getAjv = function () {
	let {ajv} = Api;

	if (!ajv) {
		const Ajv = require('ajv').default;

		ajv = Api.ajv = new Ajv({coerceTypes: true});

		try {
			var formatsFound = !!require.resolve('ajv-formats');
		}
		catch (err) {}

		if (formatsFound) {
			require('ajv-formats')(ajv);
		}
	}

	return ajv;
};
