const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const {expect} = chai;
const cp = require('child_process');
const fs = require('fs');
const {resolve} = require('path');

describe('config file', function () {
	it(`should take --config param`, function (done) {
		exec(`node cli.js -c ${cwd('apidoc.json')}`).then(done, done);
	});

	it(`should generate express middleware`, function (done) {
		var path = cwd('output', 'cliExpress.js');

		if (fs.existsSync(path)) {
			fs.unlinkSync(path);
		}

		exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path}`)
			.then(function () {
				if (!fs.existsSync(path)) {
					throw new Error('File not exists: ' + path);
				}

				var validator = require(path);
				expect(validator.endpoints).to.have.lengthOf(3);
			})
			.then(done, done);
	});

	it(`should generate by namespace`, function (done) {
		(async function () {
			var path = cwd('output', 'namespace1.js');

			if (fs.existsSync(path)) {
				fs.unlinkSync(path);
			}

			await exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path} -n controller`);

			if (!fs.existsSync(path)) {
				throw new Error('File not exists: ' + path);
			}

			var validator = require(path);

			expect(validator.endpoints).to.eql([
				{
					namespace: 'controller',
					url: {
						method: 'POST',
						path: '/controller/action'
					},
				}
			]);

			path = cwd('output', 'namespace2.js');

			if (fs.existsSync(path)) {
				fs.unlinkSync(path);
			}

			await exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path} -n default,controller`);

			validator = require(path);

			expect(validator.endpoints).to.have.lengthOf(3);
			expect(validator.endpoints).to.shallowDeepEqual([
				{
					namespace: 'default',
					url: {
						method: 'POST',
						path: '/some/path/:id'
					},
				},
				{
					namespace: 'controller',
					url: {
						method: 'POST',
						path: '/controller/action'
					},
				},
				{
					namespace: 'default',
					url: {
						method: 'GET',
						path: '/data/2.5/weather'
					},
				}
			]);
		})().then(done, done);
	});
});

function exec(code) {
	return new Promise(function (done, fail) {
		cp.exec(code, function (err) {
			if (err) {
				fail(err);
				return;
			}

			done();
		});
	});
}

function cwd(...args) {
	args.unshift(__dirname);

	return resolve.apply(null, args);
}