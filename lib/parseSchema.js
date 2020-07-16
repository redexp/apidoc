const parser = require('@babel/parser');
const t = require('@babel/types');
const generate = require('@babel/generator').default;
const schemas = require('./schemas');
const cloneDeep = require('lodash/cloneDeep');

const astObject = toAst(JSON.stringify(require('./schemas/object')));
const astArray = toAst(JSON.stringify(require('./schemas/array')));
const astEnum = toAst(JSON.stringify(require('./schemas/enum')));

module.exports = parseSchema;

function parseSchema(code) {
	var schema = codeToAjvSchema(code);

	return generate(schema).code;
}

function codeToAjvSchema(code) {
	return astToAjvSchema(toAst(code));
}

function toAst(code) {
	try {
		var ast = parser.parse(`(${code});`);
	}
	catch (err) {
		throw new Error(`Invalid json-schema: ${code}`);
	}

	return ast.program.body[0].expression;
}

function astToAjvSchema(root) {
	if (t.isAssignmentExpression(root)) {
		return astAssignToAjvSchema(root);
	}
	else if (t.isIdentifier(root) || t.isMemberExpression(root)) {
		return astObjectNameToAjvSchema(root);
	}
	else if (t.isObjectExpression(root)) {
		return astObjectToAjvSchema(root);
	}
	else if (t.isArrayExpression(root)) {
		return astArrayToAjvSchema(root);
	}
	else if (t.isLogicalExpression(root)) {
		return astEnumToAjvSchema(root);
	}
	else {
		throw new Error(`Unknown scheme node: ${root.type}`);
	}
}

function astAssignToAjvSchema(root) {
	var {left, right, operator} = root;

	if (operator !== '=') {
		throw new Error(`Invalid assign operator: ${JSON.stringify(operator)}`);
	}

	var name = getObjectName(left);
	var schema = astToAjvSchema(right);

	schemas.setAst(name, schema);

	return astToAjvSchema(right);
}

function astObjectToAjvSchema(root) {
	var type = getProp(root, 'type');

	if (type && t.isStringLiteral(type.value)) {
		return root;
	}

	root.properties.forEach(function (prop) {
		var {key, value} = prop;

		if (!t.isIdentifier(key) && !t.isStringLiteral(key)) {
			throw new Error(`Invalid object key type: ${key.type}`);
		}

		prop.value = astToAjvSchema(value);
	});

	var obj = cloneDeep(astObject);
	var properties = getProp(obj, 'properties');

	properties.value = root;

	return obj;
}

function astObjectNameToAjvSchema(root) {
	var name = getObjectName(root);
	var schema = schemas.getAst(name);

	if (!schema && !schemas.getString(name)) {
		throw new Error(`Unknown OBJECT_NAME: ${name}`);
	}

	if (!schema) {
		schema = codeToAjvSchema(schemas.getString(name));
		schemas.setAst(name, schema);
	}

	return schema;
}

function astArrayToAjvSchema(root) {
	var arr = cloneDeep(astArray);

	//TODO: handle more than one element in array
	var items = getProp(arr, 'items');

	items.value = astToAjvSchema(root.elements[0]);

	return arr;
}

function astEnumToAjvSchema(root) {
	var num = cloneDeep(astEnum);
	var items = [];

	var add = function (node) {
		var {left, right, operator} = node;

		if (operator !== '||') {
			throw new Error(`Invalid enum operator: ${operator}`);
		}

		var check = function (item) {
			if (t.isStringLiteral(item) || t.isNumericLiteral(item)) {
				items.push(item);
			}
			else if (t.isLogicalExpression(item)) {
				add(item);
			}
			else {
				throw new Error(`Invalid enum item type: ${item.type}`);
			}
		};

		check(left);
		check(right);
	};

	add(root);

	var first = items[0];

	if (items.some(item => item.type !== first.type)) {
		throw new Error(`All items of enum should be same type`);
	}

	var prop = getProp(num, 'enum');

	prop.value.elements = items;

	if (t.isNumericLiteral(first)) {
		prop = getProp(num, 'type');
		prop.value.value = "number";
	}

	return num;
}

function getProp(obj, name) {
	return obj.properties.find(function (prop) {
		var {key} = prop;

		return (
			(
				t.isIdentifier(key) &&
				key.name === name
			) ||
			(
				t.isStringLiteral(key) &&
				key.value === name
			)
		);
	});
}

function getObjectName(root) {
	var name = '';

	var add = function (node, parent) {
		if (t.isMemberExpression(node)) {
			let {object, property} = node;

			add(object, parent);
			add(property, node);
		}
		else if (t.isIdentifier(node)) {
			name += (parent ? '.' : '') + node.name;
		}
		else {
			throw new Error(`Invalid OBJECT_NAME type: ${object.type}`);
		}
	};

	add(root);

	return name;
}