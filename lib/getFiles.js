const {globSync} = require('glob');
const fs = require('fs');
const {join} = require('path');

module.exports = function getFiles(pathList) {
	return pathList.reduce(function (list, path) {
		if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
			path = join(path, '**');
		}

		return list.concat(globSync(path, {
			nodir: true
		}));
	}, []);
};