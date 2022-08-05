module.exports = ajvToJsDoc;
module.exports.ajvToDTs = ajvToDTs;
module.exports.normalizeName = normalizeName;

function ajvToJsDoc(schema, params = {}) {
	const {schemas = {}, any = '*', jsDocNull = true, anyObject = 'Object'} = params;
	const {type, title} = schema;

	if (schemas.hasOwnProperty(title)) return normalizeName(title);

	if (type === 'string' || type === 'number') {
		if (!schema.enum) return type;

		return !schema.enum ? type : schema.enum.map(v => JSON.stringify(v)).join('|');
	}

	if (type === 'boolean' || (type === 'null' && !jsDocNull)) {
		return type;
	}

	if (type === 'integer') {
		return 'number';
	}

	if (Array.isArray(type)) {
		return type.map(item => ajvToJsDoc(item, params)).join('|');
	}

	if (type === 'array') {
		if (!schema.items) {
			return `Array<${any}>`;
		}

		return `Array<${ajvToJsDoc(schema.items, params)}>`;
	}

	if (type === 'object') {
		let props = schema.properties;

		if (!props) {
			return anyObject;
		}

		var req = schema.required || [];

		props = Object.keys(props).map(function (prop) {
			return `"${prop}"${req.includes(prop) ? '' : '?'}: ${ajvToJsDoc(props[prop], params)}`;
		});

		return `{${props.join(', ')}}`;
	}

	var {anyOf, allOf} = schema;

	if (jsDocNull && anyOf && anyOf.length === 2 && anyOf.some(item => item.type === 'null')) {
		return '?' + ajvToJsDoc(anyOf.find(item => item.type !== 'null'));
	}

	if (anyOf || allOf) {
		return (anyOf || allOf).map(item => ajvToJsDoc(item, params)).join('|');
	}

	return any;
}

function ajvToDTs(schema, params = {}) {
	return ajvToJsDoc(schema, {
		any: 'any',
		jsDocNull: false,
		anyObject: '{[prop: string]: any}',
		...params,
	})
}

function normalizeName(name) {
	return name.replace(/\./g, '__');
}