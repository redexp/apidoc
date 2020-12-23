const rule = /^\s*(\d[\dx|\-\s]+)?(.+)/s;
const pureCode = /^\d+$/;
const xCode = /^[\dx]+$/;
const periodCode = /^(\d+)\s*-\s*(\d+)$/;

module.exports = function (list) {
	return list;
};

module.exports.prepare = function (value, options = {}) {
	var {defaultCode = 200} = options;

	var match = rule.exec(value);

	if (!match) {
		throw new Error(`Invalid @response value: ${JSON.stringify(value)}`);
	}

	var code = (match[1] || String(defaultCode)).trim().split('||').map(function (code) {
		code = code.trim();

		if (pureCode.test(code)) {
			code = Number(code);

			return {
				type: 'number',
				"const": code,
			};
		}

		if (xCode.test(code)) {
			code = code.replace(/x/g, '\\d');

			return {
				type: 'string',
				pattern: '^' + code + '$'
			};
		}

		if (periodCode.test(code)) {
			code = code.split('-').map(code => Number(code.trim()));

			return {
				type: 'number',
				minimum: code[0],
				maximum: code[1],
			};
		}

		throw new Error('Unknown CODE format: ' + JSON.stringify(code));
	});

	code = code.length === 0 ? null : code.length === 1 ? code[0] : {anyOf: code};

	var schema = match[2];

	return {
		code,
		schema,
	};
};