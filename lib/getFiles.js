const glob = require('glob');
const fs = require('fs');
const {join} = require('path');

module.exports = function getFiles(pathList) {
	return pathList.reduce(function (list, path) {
		if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
			path = join(path, '**');
		}

		return list.concat(glob.sync(path, {
			nodir: true
		}));
	}, []);
};