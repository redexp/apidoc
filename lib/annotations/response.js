const codesRule = /^\s*(\d[\dxX]{2}|\s*-\s*|\s*\|\|\s*)*/s;
const pureCode = /^\d+$/;
const xCode = /^[\dxX]+$/;
const periodCode = /^(\d+)\s*-\s*(\d+)$/;

module.exports = function (list) {
	return list;
};

module.exports.prepare = function (value, {defaultCode = 200} = {}) {
	if (typeof value === 'function') {
		value = value.toString();
	}

	var codes = codesRule.exec(value)[0];

	var code = codeStringToSchema(codes.trim() || defaultCode);

	var schema = value.slice(codes.length).trim();

	return {
		code,
		schema,
	};
};

module.exports.codeStringToSchema = codeStringToSchema;
module.exports.codeSchemaToString = codeSchemaToString;

function codeStringToSchema(string) {
	var schema = String(string).trim().split('||').map(function (code) {
		code = code.trim();

		if (pureCode.test(code)) {
			code = Number(code);

			return {
				type: 'number',
				"const": code,
			};
		}

		if (xCode.test(code)) {
			let regexp = code.replace(/x/ig, '\\d');

			return {
				title: code,
				type: 'string',
				pattern: '^' + regexp + '$'
			};
		}

		if (periodCode.test(code)) {
			let range = code.split('-').map(code => Number(code.trim()));

			return {
				title: code,
				type: 'number',
				minimum: range[0],
				maximum: range[1],
			};
		}

		throw new Error('Unknown CODE format: ' + JSON.stringify(code));
	});

	return schema.length === 0 ? null : schema.length === 1 ? schema[0] : {anyOf: schema};
}

function codeSchemaToString(schema) {
	schema = schema.anyOf || [schema];

	return schema.map(function (code) {
		return code.const || code.title.replace(/\s/g, '');
	}).join(' || ');
}