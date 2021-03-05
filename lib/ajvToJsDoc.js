module.exports = ajvToJsDoc;

function ajvToJsDoc(schema, cache = {}) {
	var {type, title} = schema;

	if (cache.hasOwnProperty(title)) return title;

	if (type === 'string' || type === 'number' || type === 'boolean') {
		return type;
	}

	if (type === 'integer') {
		return 'number';
	}

	if (Array.isArray(type)) {
		return type.map(item => ajvToJsDoc(item, cache)).join('|');
	}

	if (type === 'array') {
		if (!schema.items) {
			return 'Array';
		}

		return `Array<${ajvToJsDoc(schema.items, cache)}>`;
	}

	if (type === 'object') {
		let props = schema.properties;

		if (!props) {
			return 'Object';
		}

		var req = schema.required || [];

		props = Object.keys(props).map(function (prop) {
			return `"${prop}"${req.includes(prop) ? '' : '?'}: ${ajvToJsDoc(props[prop], cache)}`;
		});

		return `{${props.join(', ')}}`;
	}

	if (schema.anyOf) {
		return schema.anyOf.map(item => ajvToJsDoc(item, cache)).join('|');
	}

	return '*'
}