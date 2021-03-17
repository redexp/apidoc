const t = require('@babel/types');
const generate = require('@babel/generator').default;
const cloneDeep = require('lodash/cloneDeep');
const toAst = require('./toAst');
const getObjectName = require('./getObjectName');
const {getDefaults} = require('./schemas');
const {isPure, getProp, getPropName, prependProp, removeProp, replaceProp} = require('./object');
const methods = require('./methods');

const defaultSchemas = Object.keys(getDefaults());

const astObject = toAst(JSON.stringify(require('./schemas/object')));
const astArray = toAst(JSON.stringify(require('./schemas/array')));
const astRegexp = toAst(JSON.stringify(require('./schemas/regexp')));
const astEnum = toAst(JSON.stringify(require('./schemas/enum')));
const astAnyOf = toAst(JSON.stringify(require('./schemas/anyOf')));
const astAllOf = toAst(JSON.stringify(require('./schemas/allOf')));
const astConst = toAst(JSON.stringify(require('./schemas/const')));

module.exports = parseSchema;
module.exports.cache = {};
module.exports.getAstSchema = getAstSchema;
module.exports.generateAjvSchema = generateAjvSchema;
module.exports.resetCache = resetCache;
module.exports.astToAjvSchema = astToAjvSchema;

function parseSchema(code) {
	var schema = astToAjvSchema(toAst(code));

	replaceObjectKeysWithString(schema);
	replaceComments(schema);

	return toJsonObject(schema);
}

function generateAjvSchema(ast, cache = {}) {
	var prevCache = parseSchema.cache;
	parseSchema.cache = cache;

	var schema = astToAjvSchema(ast);

	parseSchema.cache = prevCache;

	replaceObjectKeysWithString(schema);
	replaceComments(schema);

	return toJsonObject(schema);
}

function getAstSchema(code, cache) {
	var schema = toAst(code);

	if (t.isAssignmentExpression(schema)) {
		let {left, right} = schema;
		var name = getObjectName(left);

		cache[name] = right;
	}

	return schema;
}

function toJsonObject(schema) {
	try {
		return JSON.parse(generate(schema).code);
	}
	catch (e) {
		throw e;
	}
}

function astToAjvSchema(root) {
	if (t.isAssignmentExpression(root)) {
		return astAssignToAjvSchema(root);
	}
	else if (t.isIdentifier(root) || t.isMemberExpression(root) || t.isBinaryExpression(root) || t.isNullLiteral(root)) {
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
	else if (t.isStringLiteral(root)) {
		return astStringToAjvSchema(root);
	}
	else if (t.isRegExpLiteral(root)) {
		return astRegexToAjvSchema(root);
	}
	else if (t.isCallExpression(root)) {
		return astCallExpToAjvSchema(root);
	}
	else {
		throw new Error(`Unknown scheme node: ${root.type}`);
	}
}

function astAssignToAjvSchema(root) {
	var {right} = root;

	var name = getSchemaName(root);

	var schema = astToAjvSchema(right);

	addSchemaName(schema, name);
	addDescription(root, schema);

	parseSchema.cache[name] = cloneDeep(schema);

	return schema;
}

function astObjectToAjvSchema(root) {
	var pure = isPure(root);

	if (pure && root.properties.every(prop => !t.isSpreadElement(prop))) {
		addDescription(root, root);
		return root;
	}

	var type = pure && getProp(root, 'type');
	var obj = pure ? t.objectExpression(type ? [cloneDeep(type)] : []) : cloneDeep(astObject);
	var required = getProp(obj, 'required');
	var properties = getProp(obj, 'properties');

	var props = [];

	var flush = function () {
		if (props.length === 0) return;

		methods.set(obj, [t.objectExpression(props)], {createNew: false});
		props = [];

		required = getProp(obj, 'required');
		properties = getProp(obj, 'properties');
	};

	var toggleRequired = function (name, add) {
		var list = required.value.elements;

		if (add) {
			if (list.every(s => s.value !== name)) {
				list.push(t.stringLiteral(name));
			}
		}
		else {
			required.value.elements = list.filter(s => s.value !== name);
		}
	};

	root.properties.forEach(function (prop) {
		if (t.isSpreadElement(prop)) {
			flush();

			var src = prop.argument;

			methods[isPure(src) ? 'set' : 'merge'](obj, [src], {createNew: false});

			required = getProp(obj, 'required');
			properties = getProp(obj, 'properties');
		}
		else if (pure && t.isObjectProperty(prop)) {
			if (prop.computed) {
				throw new Error(`Invalid object key: You can't use "optional" properties in pure ajv validator`);
			}

			props.push(prop);
		}
		else if (t.isObjectProperty(prop)) {
			let {value} = prop;
			let name = getPropName(prop);
			let optional = prop.computed;

			if (t.isIdentifier(value) && value.name === 'undefined') {
				toggleRequired(name, false);
				removeProp(properties.value, name);
				return;
			}

			if (name.includes('?')) {
				name = prop.key.value = name.replace('?', '');
				optional = true;
			}

			toggleRequired(name, !optional);

			prop.computed = false; // [key]: => key:
			prop.value = astToAjvSchema(value);

			addDescription(prop, prop.value);

			replaceProp(properties.value, prop);
		}
		else {
			throw new Error(`Invalid object element: ${prop.type}`);
		}
	});

	flush();

	addDescription(root, obj);

	return obj;
}

function astObjectNameToAjvSchema(root) {
	var name = getObjectName(root);
	var ast = parseSchema.cache[name];

	if (!ast) {
		throw new Error(`Unknown OBJECT_NAME: ${name}`);
	}

	var schema = astToAjvSchema(cloneDeep(ast));

	addSchemaName(schema, name);

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
	var items = [];

	var add = function (node) {
		var {left, right, operator} = node;

		if (operator !== '||' && operator !== '&&') {
			throw new Error(`Invalid enum operator: ${operator}`);
		}

		if (operator !== root.operator) {
			throw new Error(`All operators of enum should be same type: ${root.operator}`);
		}

		var check = function (item) {
			if (t.isStringLiteral(item) || t.isNumericLiteral(item)) {
				items.push(item);
			}
			else if (t.isLogicalExpression(item)) {
				add(item);
			}
			else {
				items.push(astToAjvSchema(item));
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

	if (t.isStringLiteral(first) || t.isNumericLiteral(first)) {
		if (root.operator !== '||') {
			throw new Error(`Invalid operator for enum: ${root.operator}`);
		}

		var $enum = cloneDeep(astEnum);
		getProp($enum, 'enum').value.elements = items;

		if (t.isNumericLiteral(first)) {
			getProp($enum, 'type').value.value = "number";
		}

		return $enum;
	}

	if (root.operator === '||') {
		var anyOf = cloneDeep(astAnyOf);
		getProp(anyOf, 'anyOf').value.elements = items;
		return anyOf;
	}
	else {
		var allOf = cloneDeep(astAllOf);
		getProp(allOf, 'allOf').value.elements = items;
		return allOf;
	}
}

function astStringToAjvSchema(root) {
	var $const = cloneDeep(astConst);

	getProp($const, 'const').value = cloneDeep(root);

	return $const;
}

function astRegexToAjvSchema(root) {
	var regexp = cloneDeep(astRegexp);

	getProp(regexp, 'pattern').value = t.stringLiteral(root.pattern);

	return regexp;
}

function astCallExpToAjvSchema(root) {
	if (!t.isMemberExpression(root.callee)) {
		throw new Error(`Invalid call expression: ${root.callee.type}`);
	}

	var {object, property} = root.callee;
	var schema = astToAjvSchema(object);
	var {name} = property;
	var method = methods[name];

	if (!method) {
		throw new Error(`Unknown schema method: ${name}`);
	}

	schema = method(schema, root.arguments);

	var title = t.isObjectExpression(schema) && getProp(schema, 'title');

	if (title) {
		removeProp(schema, 'title');
	}

	return schema;
}

function addDescription(root, target) {
	let comments = root.leadingComments || root.trailingComments;

	if (comments && comments.length > 0 && !getProp(target, 'description')) {
		prependProp(
			target,
			t.objectProperty(
				t.identifier('description'),
				t.stringLiteral(
					comments.map(c => c.value.trim()).join('\n')
				)
			)
		);
	}
}

function replaceObjectKeysWithString(root) {
	if (t.isObjectExpression(root)) {
		root.properties.forEach(function (prop) {
			var {key} = prop;

			if (t.isIdentifier(key)) {
				prop.key = t.stringLiteral(key.name);
			}
			else if (!t.isStringLiteral(key)) {
				throw new Error(`Unknown object property key type: ${key.type}`);
			}
			else {
				delete key.extra;
			}

			replaceObjectKeysWithString(prop.value);
		});
	}
	else if (t.isArrayExpression(root)) {
		root.elements.forEach(replaceObjectKeysWithString);
	}
	else if (t.isStringLiteral(root) && root.extra) {
		delete root.extra; // replace single comma to double
	}

	return root;
}

function replaceComments(root) {
	root.innerComments = root.leadingComments = root.trailingComments = undefined;

	if (t.isObjectExpression(root)) {
		root.properties.forEach(replaceComments);
	}
	else if (t.isArrayExpression(root)) {
		root.elements.forEach(replaceComments);
	}
	else if (t.isObjectProperty(root)) {
		root.innerComments = root.leadingComments = root.trailingComments = undefined;

		replaceComments(root.value);
	}

	return root;
}

function getSchemaName(root) {
	if (!t.isAssignmentExpression(root)) return;

	var {left, operator} = root;

	if (operator !== '=') {
		throw new Error(`Invalid assign operator: ${JSON.stringify(operator)}`);
	}

	return getObjectName(left);
}

function addSchemaName(root, name) {
	if (!name || !root.properties || defaultSchemas.includes(name)) return;

	replaceProp(
		root,
		t.objectProperty(
			t.stringLiteral('title'),
			t.stringLiteral(name)
		)
	);
}

function resetCache(cache = {}) {
	parseSchema.cache = cache;
}