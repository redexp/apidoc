const {exec} = require('child_process');
const fs = require('fs');
const {resolve} = require('path');

describe('config file', function () {
	it(`should take --config param`, function (done) {
		exec(`node cli.js -c ${cwd('apidoc.json')}`, function (err) {
			if (err) {
				done(err);
				return;
			}

			done();
		});
	});

	it(`should generate express middleware`, function (done) {
		var path = cwd('output', 'cliExpress.js');

		if (fs.existsSync(path)) {
			fs.unlinkSync(path);
		}

		exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path}`, function (err) {
			if (err) {
				done(err);
				return;
			}

			if (!fs.existsSync(path)) {
				done(new Error('File not exists: ' + path));
				return;
			}

			done();
		});
	});
});

function cwd(...args) {
	args.unshift(__dirname);

	return resolve.apply(null, args);
}