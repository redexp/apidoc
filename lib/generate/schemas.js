const {writeFile} = require('fs/promises');

module.exports = async function (endpoints, names, path) {
	const schemas = [];

	for (const e of endpoints) {
		if (!e.schema) continue;

		for (const {name, schema} of e.schema) {
			if (names === true) {
				schemas.push(schema);
			}
			else if (name && names.includes(name)) {
				schemas.push(schema);
			}
		}
	}

	if (path) {
		return writeFile(path, JSON.stringify(schemas));
	}

	console.log(JSON.stringify(schemas, null, '  '));
};