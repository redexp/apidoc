const {writeFile} = require('fs/promises');
const {resolve} = require('path');

module.exports = async function (endpoints, names, cwd = process.cwd()) {
	let path = names.find(name => /\.json$/i.test(name));

	if (path) {
		names = names.filter(name => name !== path);
		path = resolve(cwd, path);
	}

	const schemas = [];

	for (const e of endpoints) {
		if (!e.schema) continue;

		for (const {name, schema} of e.schema) {
			if (names.length > 0) {
				if (name && names.includes(name)) {
					schemas.push(schema);
				}
			}
			else {
				schemas.push(schema);
			}
		}
	}

	if (path) {
		return writeFile(path, JSON.stringify(schemas));
	}

	console.log(JSON.stringify(schemas, null, '  '));
};