const parser = require('@babel/parser');
const t = require('@babel/types');
const getObjectName = require('../getObjectName');

module.exports = function (code) {
	if (typeof code === 'function') {
		code = code.toString().replace(/^\s*\(\s*\)\s*=>\s*/, '');
	}

	try {
		var ast = parser.parse(code);
	}
	catch (err) {
		throw new Error(`Invalid @call value: ${code}`);
	}

	try {
		var node = ast.program.body[0].expression;
	}
	catch (err) {
		throw new Error(`Invalid @call method call: ${code}`);
	}

	var params = node.arguments.map(function (item) {
		if (!t.isIdentifier(item)) {
			throw new Error(`Invalid argument type of @call method call: ${item.type}`);
		}

		return item.name;
	});

	if (!t.isIdentifier(node.callee) && !t.isMemberExpression(node.callee)) {
		throw new Error(`Invalid @call method type: ${node.callee.type}`);
	}

	var method = getObjectName(node.callee);
	var parts = method.split('.');

	return {
		code,
		method,
		parts,
		params,
	};
};