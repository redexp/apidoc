const parser = require('@babel/parser');

module.exports = function toAst(code) {
	try {
		var ast = parser.parse(`(${code});`);
	}
	catch (err) {
		throw new Error(`Invalid json-schema: ${code}`);
	}

	return ast.program.body[0].expression;
};