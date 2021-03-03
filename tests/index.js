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
				expect(validator.endpoints).to.have.lengthOf(4);
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

			expect(validator.endpoints).to.shallowDeepEqual([
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

			expect(validator.endpoints).to.have.lengthOf(4);
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
						method: "GET",
						path: "/users"
					}
				},
				{
					namespace: 'default',
					url: {
						method: 'GET',
						path: '/data/:version/weather'
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

	it('should generate api client', function (done) {
		var path = cwd('output', 'cliApi.js');

		remove(path);

		exec(`node cli.js -c ${cwd('apidoc.json')} -a ${path}`)
			.then(async function () {
				isExist(path);

				var Api = require(path);
				expect(Api.baseUrl).to.eql('https://samples.openweathermap.org');
				expect(Api.request).to.be.a('function');

				var client = new Api();

				expect(client).to.have.nested.property('weather.get').that.is.a('function');
				expect(client).to.have.nested.property('app.test1').that.is.a('function');

				var n = 0;

				Api.request = function ({url, query, body}) {
					n++;
					expect(url).to.eql('/some/path/100');
					expect(query).to.eql(n === 1 ? {r: 200} : {r: 200, q: 'test'});
					expect(body).to.eql({any: 'value'});

					return {
						statusCode: 210,
						body: {data: '21x'}
					};
				};

				var result = await client.app.test1(100, {r: 200}, {any: 'value'});
				expect(result).to.eql({data: '21x'});
				expect(n).to.eql(1);

				result = await client.app.test1({id: 100}, {r: 200, q: 'test'}, {any: 'value'});
				expect(result).to.eql({data: '21x'});
				expect(n).to.eql(2);
			})
			.then(done, done);
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