const fs = require('fs');
const {resolve} = require('path');

const tpl = fs.readFileSync(resolve(__dirname, 'templates', 'test.js')).toString();

module.exports = function (endpoint) {
	if (!endpoint.call) {
		throw new Error(`endpoint.call is required`);
	}

	return tpl.replace(/(\bparts\b|\bcode\b|\bmethod\b|\bendpoint\b| \* @param params\n)/g, function (x, name) {
		switch (name) {
		case 'parts':
			return JSON.stringify(endpoint.call.parts);
		case 'code':
			return endpoint.call.code.trim();
		case 'method':
			return endpoint.call.method;
		case 'endpoint':
			return JSON.stringify(endpoint, null, "  ");
		case " * @param params\n":
			let {params} = endpoint.call;

			if (endpoint.body) {
				params = params.concat('body');
			}

			return params
				.map(name => ` * @param ${name}\n`)
				.join('');
		default:
			throw new Error(`Unknown replacement param: ${JSON.stringify(name)}`);
		}
	});
};