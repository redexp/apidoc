const t = require('@babel/types');
const generate = require('@babel/generator').default;
const cloneDeep = require('lodash/cloneDeep');
const uniq = require('lodash/uniq');
const pull = require('lodash/pull');
const toAst = require('./toAst');
const getObjectName = require('./getObjectName');
const {getDefaults} = require('./schemas');

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
module.exports.getProp = getProp;

function parseSchema(code) {
	var schema = astToAjvSchema(toAst(code));

	replaceObjectKeysWithString(schema);
	replaceComments(schema);

	return toJsonObject(schema);
}

function generateAjvSchema(ast, cache = {}) {
	parseSchema.cache = cache;

	var schema = astToAjvSchema(ast);

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
	else {
		throw new Error(`Unknown scheme node: ${root.type}`);
	}
}

function astAssignToAjvSchema(root) {
	var {right} = root;

	var name = getSchemaName(root);

	parseSchema.cache[name] = cloneDeep(right);

	var schema = astToAjvSchema(right);
	addSchemaName(schema, name);
	return schema;
}

function astObjectToAjvSchema(root) {
	var type = getProp(root, 'type');
	var pure = isPure(root);
	var rootType = pure ? type.value.value : 'object';
	var isRootTypeObject = rootType === 'object';

	if (pure && !root.properties.some(prop => t.isSpreadElement(prop))) {
		return root;
	}

	var obj = pure ? root : cloneDeep(astObject);
	var ownProps = [...obj.properties];
	var required = [];
	var properties = [];

	root.properties.forEach(function (prop) {
		if (t.isSpreadElement(prop)) {
			pull(ownProps, prop);

			let pure = isPure(prop.argument);
			let schema = astToAjvSchema(prop.argument);
			let type = getProp(schema, 'type');
			let req = getProp(schema, 'required');
			let props = getProp(schema, 'properties');

			if (!type || !t.isStringLiteral(type.value) || type.value.value !== rootType) {
				throw new Error(`You can extend only same type validators: ${rootType} and ${type.value.value}`);
			}

			req = req ? req.value.elements.map(str => str.value) : [];

			if (pure) {
				required = req;
			}

			if (props) {
				props.value.properties.forEach(function (prop) {
					let name = getPropName(prop);

					replaceProp(properties, prop);

					if (pure) return;

					if (req.includes(name)) {
						required.push(name);
					}
					else {
						pull(required, name);
					}
				});
			}

			schema.properties.forEach(function (prop) {
				let name = getPropName(prop);

				if (name === 'type' || name === 'title' || (isRootTypeObject && (name === 'required' || name === 'properties'))) {
					return;
				}

				replaceProp(ownProps, prop);
			});
		}
		else if (pure && t.isObjectProperty(prop)) {
			if (prop.computed) {
				throw new Error(`Invalid object key: You can't use "optional" properties in pure ajv validator`);
			}

			let name = getPropName(prop);

			if (name === 'required') {
				required = prop.value.elements.map(item => item.value);
			}

			replaceProp(ownProps, prop);
		}
		else if (t.isObjectProperty(prop)) {
			let {value} = prop;
			let name = getPropName(prop);

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

			replaceProp(properties, prop);
		}
		else {
			throw new Error(`Invalid object element: ${prop.type}`);
		}
	});

	obj.properties = ownProps;

	if (!isRootTypeObject) return obj;

	var requiredProp = getProp(obj, 'required');
	var propertiesProp = getProp(obj, 'properties');

	if (!requiredProp) {
		requiredProp = t.objectProperty(t.identifier('required'), t.arrayExpression());
		obj.properties.push(requiredProp);
	}

	if (!propertiesProp) {
		propertiesProp = t.objectProperty(t.identifier('properties'), t.objectExpression([]));
		obj.properties.push(propertiesProp);
	}

	requiredProp.value.elements = uniq(required).map(v => t.stringLiteral(v));
	propertiesProp.value.properties = properties;

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

function isPure(root) {
	var type = t.isObjectExpression(root) && getProp(root, 'type');
	return !!type && t.isStringLiteral(type.value);
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
		throw new Error(`Invalid object key type: ${key.type}`);
	}
}

function removeProp(props, name) {
	props.some(function (prop, i) {
		if (t.isSpreadElement(prop)) return;

		if (getPropName(prop) === name) {
			props.splice(i, 1);
			return true;
		}
	});
}

function replaceProp(props, prop) {
	removeProp(props, getPropName(prop));
	props.push(prop);
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

function replaceComments(root) {
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

	root.properties.push(
		t.objectProperty(t.stringLiteral('title'), t.stringLiteral(name))
	);
}

function resetCache(cache = {}) {
	parseSchema.cache = cache;
}