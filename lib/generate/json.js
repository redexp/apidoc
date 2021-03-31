const fs = require('fs');
const {promisify} = require('util');
const writeFile = promisify(fs.writeFile);

module.exports = function generateJson(endpoints, path) {
	return writeFile(path, JSON.stringify(endpoints));
};