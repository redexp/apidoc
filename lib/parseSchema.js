const t = require('@babel/types');
const generate = require('@babel/generator').default;
const cloneDeep = require('lodash/cloneDeep');
const uniq = require('lodash/uniq');
const pull = require('lodash/pull');
const toAst = require('./toAst');
const getObjectName = require('./getObjectName');

const astObject = toAst(JSON.stringify(require('./schemas/object')));
const astArray = toAst(JSON.stringify(require('./schemas/array')));
const astEnum = toAst(JSON.stringify(require('./schemas/enum')));
const astAnyOf = toAst(JSON.stringify(require('./schemas/anyOf')));
const astAllOf = toAst(JSON.stringify(require('./schemas/allOf')));

module.exports = parseSchema;
module.exports.cache = {};
module.exports.getAstSchema = getAstSchema;
module.exports.generateAjvSchema = generateAjvSchema;
module.exports.resetCache = resetCache;

function parseSchema(code) {
	var schema = codeToAjvSchema(code);

	replaceObjectKeysWithString(schema);

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

function generateAjvSchema(root, cache = {}) {
	parseSchema.cache = cache;

	var schema = astToAjvSchema(root);

	replaceObjectKeysWithString(schema);

	return toJsonObject(schema);
}

function codeToAjvSchema(code) {
	return astToAjvSchema(toAst(code));
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
	else if (t.isIdentifier(root) || t.isMemberExpression(root) || t.isBinaryExpression(root)) {
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

	parseSchema.cache[name] = schema;

	return schema;
}

function astObjectToAjvSchema(root) {
	var type = getProp(root, 'type');

	if (type && t.isStringLiteral(type.value)) {
		return root;
	}

	var required = [];
	var properties = [];
	var merge = [];

	root.properties.forEach(function (prop) {
		if (t.isSpreadElement(prop)) {
			let schema = astToAjvSchema(prop.argument);
			let type = getProp(schema, 'type');
			let req = getProp(schema, 'required');
			let props = getProp(schema, 'properties');

			if (!type || !t.isStringLiteral(type.value) || type.value.value !== 'object') {
				throw new Error(`You can extend only "object" validator`);
			}

			merge.push(schema);

			req = !req ? [] : req.value.elements.map(str => str.value);

			if (props) {
				props.value.properties.forEach(function (prop) {
					let {key} = prop;
					let name = t.isIdentifier(key) ? key.name : key.value;

					removeProp(properties, name);

					if (req.includes(name)) {
						required.push(name);
					}
					else {
						pull(required, name);
					}

					properties.push(prop);
				});
			}
		}
		else if (t.isObjectProperty(prop)) {
			let {key, value} = prop;

			if (!t.isIdentifier(key) && !t.isStringLiteral(key)) {
				throw new Error(`Invalid object key type: ${key.type}`);
			}

			let name = t.isIdentifier(key) ? key.name : key.value;

			if (t.isIdentifier(value) && value.name === 'undefined') {
				pull(required, name);
				removeProp(properties, name);
				return;
			}

			if (prop.computed) { // means optional [key]
				pull(required, name);
			}
			else {
				required.push(name);
			}

			prop.computed = false; // [key]: => key:
			prop.value = astToAjvSchema(value);

			removeProp(properties, name);
			properties.push(prop);
		}
		else {
			throw new Error(`Invalid object element: ${prop.type}`);
		}
	});

	root.properties = properties;

	var obj = cloneDeep(astObject);

	merge.forEach(function (schema) {
		schema.properties.forEach(function (prop) {
			var name = getPropName(prop);

			if (name === 'properties' || name === 'required') {
				return;
			}

			var item = getProp(obj, name);

			if (item) {
				item.value = prop.value;
			}
			else {
				obj.properties.push(prop);
			}
		});
	});

	getProp(obj, 'required').value.elements = uniq(required).map(v => t.stringLiteral(v));
	getProp(obj, 'properties').value = root;

	return obj;
}

function astObjectNameToAjvSchema(root) {
	var name = getObjectName(root);
	var schema = parseSchema.cache[name];

	if (!schema) {
		throw new Error(`Unknown OBJECT_NAME: ${name}`);
	}

	return cloneDeep(astToAjvSchema(schema));
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

function getProp(obj, name) {
	if (!Array.isArray(obj.properties)) {
		throw new Error(`Invalid object without properties: ${obj.type}`);
	}

	return obj.properties.find(function (prop) {
		return t.isObjectProperty(prop) && getPropName(prop) === name;
	});
}

function getPropName(prop) {
	var {key} = prop;

	if (t.isIdentifier(key)) {
		return key.name;
	}
	else if (t.isStringLiteral(key)) {
		return key.value;
	}
	else {
		throw new Error(`Unknown prop key type: ${key.type}`);
	}
}

function removeProp(props, name) {
	props.some(function (prop, i) {
		if (getPropName(prop) === name) {
			props.splice(i, 1);
			return true;
		}
	});
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

function resetCache(cache = {}) {
	parseSchema.cache = cache;
}