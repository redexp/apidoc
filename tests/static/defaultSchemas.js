const toAst = require('adv-parser/lib/toAst');

const schemas = {};

schemas.test = toAst('!!' + JSON.stringify({
	type: "string",
	const: "test",
}));

module.exports = schemas;