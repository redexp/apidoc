let schemas = require('adv-parser/schemas');
const toAst = require('adv-parser/lib/toAst');

schemas = {...schemas};

schemas.test = toAst({
	type: "string",
	const: "test",
});

module.exports = schemas;