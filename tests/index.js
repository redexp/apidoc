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
		const {application, request, response} = require('express');

		var path = cwd('output', 'cliExpress.js');

		remove(path);

		exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path}`)
			.then(async function () {
				isExist(path);

				var test = require(path);
				expect(test.endpoints).to.have.lengthOf(4);

				const runTest = function (reqData, code, resBody) {
					return new Promise(function (done) {
						const app = Object.assign(Object.create(application), {
							settings: {}
						});

						const req = Object.assign(Object.create(request), reqData, {app});

						const res = Object.assign(Object.create(response), {
							app,
							json: done,
						});

						const next = function (err) {
							if (err) {
								done(err);
								return;
							}

							res.status(code);
							res.json(resBody);
						};

						try {
							test(req, res, next);
						}
						catch (error) {
							done(error);
						}
					});
				};

				var req = {
					method: 'POST',
					url: '/some/path/100',
					query: {
						r: 1
					},
					params: {
						id: '100'
					},
					body: {},
				};

				var data = await runTest(req, 200, {
					data: {id: '1'}
				});

				expect(req.params.id).to.equal(100);

				expect(data).to.eql({
					data: {id: 1}
				});

				req.params.id = 'a';

				data = await runTest(req, 200, {
					data: {id: '1'}
				});

				expect(data).to.be.instanceof(test.RequestValidationError);

				expect(data).to.shallowDeepEqual({
					message: 'Invalid URL params',
					property: 'params',
					errors: [{
						dataPath: "/id",
						message: "should be number",
					}]
				});

				req.params.id = '100';

				data = await runTest(req, 200, {
					data: {id: 'a'}
				});

				expect(data).to.be.instanceof(test.ResponseValidationError);

				expect(data).to.shallowDeepEqual({
					message: 'Invalid response body',
					errors: [{
						dataPath: "/data/id",
						message: "should be number",
					}]
				});

				data = await runTest(req, 210, {
					data: '21x'
				});

				expect(data).to.eql({
					data: '21x'
				});

				data = await runTest(req, 210, {
					data: '21y'
				});

				expect(data).to.shallowDeepEqual({
					message: 'Invalid response body',
					errors: [{
						"dataPath": "/data",
						"message": "should be equal to constant"
					}]
				});

				data = await runTest(req, 350, {
					data: {id: 1}
				});

				expect(data).to.eql({
					data: {id: 1}
				});

				data = await runTest(req, 350, {
					data: {id: 0}
				});

				expect(data).to.shallowDeepEqual({
					message: 'Invalid response body',
					errors: [{
						"dataPath": "/data/id",
						"message": "should be >= 1"
					}]
				});

				var codes = [404, 500, 505];

				for (let i = 0; i < codes.length; i++) {
					data = await runTest(req, codes[i], {
						data: {test: -1}
					});

					expect(data).to.eql({
						data: {test: -1}
					});

					data = await runTest(req, codes[i], {
						data: {test: 'a'}
					});

					expect(data).to.shallowDeepEqual({
						message: 'Invalid response body',
						errors: [{
							"dataPath": "/data/test",
							"message": "should be number"
						}],
					});
				}
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

			expect(validator).to.have.nested.property('endpoints[0].response[0].code').that.to.eql({
				title: '5xx',
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

				Api.request = function ({url}) {
					n++;
					expect(url).to.eql('/v1/controller/action');

					return {
						statusCode: 200,
						body: {success: true},
					};
				};

				result = await client.controller.action();
				expect(result).to.eql({success: true});
				expect(n).to.eql(3);
			})
			.then(done, done);
	});

	it('should generate OpenAPI', function (done) {
		var path = cwd('output', 'cliOpenAPI.json');

		remove(path);

		exec(`node cli.js -c ${cwd('apidoc.json')} -o ${path}`)
			.then(async function () {
				isExist(path);

				var schema1 = JSON.parse(fs.readFileSync(path).toString());
				var schema2 = JSON.parse(fs.readFileSync(cwd('static', 'open-api.json')).toString());

				expect(schema1).to.eql(schema2);
			})
			.then(done, done);
	});

	it('should generate endpoints with includeJsdoc', function (done) {
		var path = cwd('output', 'jsdoc.json');

		exec(`node cli.js -c ${cwd('includeJsdoc.json')} -j ${path}`)
			.then(function () {
				isExist(path);

				var schema1 = JSON.parse(fs.readFileSync(path).toString());
				var schema2 = JSON.parse(fs.readFileSync(cwd('static', 'jsdoc.json')).toString());

				expect(schema1).to.eql(schema2);
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