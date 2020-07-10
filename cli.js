const {program} = require('commander');
const fs = require('fs');
const {join} = require('path');
const glob = require('glob');
const convert = require('./index');

program
	.requiredOption('-c, --config <path>', 'path to config json file');

program.parse(process.argv);

const configPath = program.config;

if (!fs.existsSync(configPath)) {
	throw new Error('config file not found: ' + JSON.stringify(configPath));
}

const config = JSON.parse(fs.readFileSync(configPath).toString());

var files = getFiles(config.include);

if (config.exclude) {
	let exclude = getFiles(config.exclude);

	files = files.filter(function (file) {
		return !exclude.includes(file);
	});
}

convert(files);

function getFiles(pathList) {
	return pathList.reduce(function (list, path) {
		if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
			path = join(path, '**');
		}

		return list.concat(glob.sync(path, {
			nodir: true
		}));
	}, []);
}