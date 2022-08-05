module.exports = ajvToJsDoc;
module.exports.normalizeName = normalizeName;

function ajvToJsDoc(schema, params = {}) {
	const {schemas = {}, any = '*'} = params;
	const {type, title} = schema;

	if (schemas.hasOwnProperty(title)) return normalizeName(title);

	if (type === 'string' || type === 'number' || type === 'boolean') {
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
			return 'Array';
		}

		return `Array<${ajvToJsDoc(schema.items, params)}>`;
	}

	if (type === 'object') {
		let props = schema.properties;

		if (!props) {
			return 'Object';
		}

		var req = schema.required || [];

		props = Object.keys(props).map(function (prop) {
			return `"${prop}"${req.includes(prop) ? '' : '?'}: ${ajvToJsDoc(props[prop], params)}`;
		});

		return `{${props.join(', ')}}`;
	}

	var {anyOf, allOf} = schema;

	if (anyOf && anyOf.length === 2 && anyOf.some(item => item.type === 'null')) {
		return '?' + ajvToJsDoc(anyOf.find(item => item.type !== 'null'));
	}

	if (anyOf || allOf) {
		return (anyOf || allOf).map(item => ajvToJsDoc(item, params)).join('|');
	}

	return any;
}

function normalizeName(name) {
	return name.replace(/\./g, '__');
}