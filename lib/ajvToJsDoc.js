module.exports = ajvToJsDoc;
module.exports.ajvToDTs = ajvToDTs;
module.exports.normalizeName = normalizeName;

function ajvToJsDoc(schema, params = {}) {
	const {schemas = {}, any = '*', jsDocNull = true, anyObject = 'Object', usedSchemas} = params;
	const {type, title} = schema;

	if (schemas.hasOwnProperty(title)) {
		if (usedSchemas && !usedSchemas.includes(title)) {
			usedSchemas.push(title);
		}

		return normalizeName(title);
	}

	if (type === 'string' || type === 'number') {
		return (
			schema.hasOwnProperty('const') ?
				JSON.stringify(schema.const) :
			schema.enum ?
				schema.enum.map(v => JSON.stringify(v)).join('|') :
				type
		);
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
		const props = schema.properties;

		if (!props) {
			return anyObject;
		}

		const req = schema.required || [];

		return (
			'{' +
			Object.keys(props)
			.map(function (prop) {
				const name = JSON.stringify(prop).replace(/^"([a-z_$][\w$]*)"$/i, '$1');

				return `${name}${req.includes(prop) ? '' : '?'}: ${ajvToJsDoc(props[prop], params)}`;
			})
			.join(', ')
			+ '}'
		);
	}

	const {anyOf, allOf} = schema;
	const types = ['string', 'number', 'integer'];

	if (anyOf && anyOf.every(item => types.includes(item.type) && item.enum || item.type === 'null')) {
		return anyOf.reduce((list, item) => {
			list.push(ajvToJsDoc(item, params));

			return list;
		}, []).join('|');
	}

	if (jsDocNull && anyOf && anyOf.length === 2 && anyOf.some(item => item.type === 'null')) {
		return '?' + ajvToJsDoc(anyOf.find(item => item.type !== 'null'));
	}

	if (anyOf || allOf) {
		const list = [];

		for (const item of (anyOf || allOf)) {
			const schema = ajvToJsDoc(item, params);

			if (list.includes(schema)) continue;

			list.push(schema);
		}

		return list.join('|');
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