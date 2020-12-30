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

		remove(path);

		exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path}`)
			.then(function () {
				isExist(path);

				var validator = require(path);
				expect(validator.endpoints).to.have.lengthOf(3);
			})
			.then(done, done);
	});

	it(`should generate by namespace`, function (done) {
		(async function () {
			var path = cwd('output', 'namespace1.js');

			remove(path);

			await exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path} -n controller`);

			isExist(path);

			var validator = require(path);

			expect(validator.endpoints).to.eql([
				{
					namespace: 'controller',
					url: {
						method: 'GET',
						path: '/controller/action'
					},
					"response": [
						{
							"code": {
								"const": 200,
								"type": "number"
							},
							"schema": {
								"additionalProperties": false,
								"properties": {
									"success": {
										"type": "boolean"
									}
								},
								"required": [
									"success"
								],
								"type": "object"
							}
						}
					]
				}
			]);

			path = cwd('output', 'namespace2.js');

			remove(path);

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
						method: 'GET',
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

	it('should generate with defaults', function (done) {
		(async function () {
			var path = cwd('output', 'defaultMethod.js');

			remove(path);

			await exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path} -n controller -M PUT`);

			isExist(path);

			var validator = require(path);

			expect(validator.endpoints[0].url.method).to.eql('PUT');

			path = cwd('output', 'defaultCode.js');

			remove(path);

			await exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path} -n controller -C 5xx`);

			isExist(path);

			validator = require(path);

			expect(validator.endpoints[0].response[0].code).to.eql({
				type: 'string',
				pattern: '^5\\d\\d$'
			});
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

function isExist(path) {
	if (!fs.existsSync(path)) {
		throw new Error('File not exists: ' + path);
	}
}

function remove(file) {
	if (fs.existsSync(file)) {
		fs.unlinkSync(file);
	}
}