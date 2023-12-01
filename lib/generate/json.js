const {writeFile} = require('fs/promises');

module.exports = function generateJson(endpoints, path) {
	return writeFile(path, JSON.stringify(endpoints));
};