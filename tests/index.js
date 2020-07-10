var {exec} = require('child_process');

describe('config file', function () {
	it(`should take --config param`, function (done) {
		exec(`node cli.js -c tests/apidoc.json`, function (err) {
			if (err) {
				done(err);
			}
			else {
				done();
			}
		});
	});
});