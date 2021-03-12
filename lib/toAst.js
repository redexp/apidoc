const parser = require('@babel/parser');

module.exports = function toAst(code) {
	if (code.includes('#')) {
		code = code.replace(/^(\s*)#/gm, '$1//');
	}

	try {
		var ast = parser.parse(`(\n${code}\n);`);
	}
	catch (err) {
		throw new Error(`Invalid json-schema: ${code}`);
	}

	return ast.program.body[0].expression;
};