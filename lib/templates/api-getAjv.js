
Api.getAjv = function ({type}) {
	const key = type + 'Ajv';
	let ajv = Api[key];

	if (ajv) return ajv;

	const Ajv = require('ajv').default;

	ajv = Api[key] = new Ajv({coerceTypes: type === 'response'});

	try {
		var formatsFound = !!require.resolve('ajv-formats');
	}
	catch (err) {}

	if (formatsFound) {
		require('ajv-formats')(ajv);
	}

	return ajv;
};
