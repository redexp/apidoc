const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const {expect} = chai;
const {readFileSync, existsSync, unlinkSync} = require('fs');
const {resolve} = require('path');
const exec = require('util').promisify(require('child_process').exec);

describe('config file', function () {
	beforeEach(function () {
		return exec(`rm -rf ${cwd('output')}/*`);
	});
	
	it(`should take --config param`, async function () {
		await exec(`node cli.js -c ${cwd('apidoc.json')}`);
	});

	it(`should generate express middleware`, async function () {
		const {application, request, response} = require('express');

		var path = cwd('output', 'cliExpress.js');

		remove(path);

		await exec(`node cli.js -c ${cwd('apidoc.json')} -e ${path}`);

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
				instancePath: "/id",
				message: "must be number",
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
				instancePath: "/data/id",
				message: "must be number",
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
				"instancePath": "/data",
				"message": "must be equal to constant"
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
				"instancePath": "/data/id",
				"message": "must be >= 1"
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
					"instancePath": "/data/test",
					"message": "must be number"
				}],
			});
		}
	});

	it(`should generate by namespace`, async function () {
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

		const {endpoints} = require(path);

		expect(endpoints).to.have.lengthOf(4);

		expect(endpoints.find(e => e.url.path === '/some/path/:id')).to.deep.includes({
			namespace: 'default',
			url: {
				method: 'POST',
				path: '/some/path/:id'
			},
		});
		expect(endpoints.find(e => e.url.path === '/controller/action')).to.deep.includes({
			namespace: 'controller',
			url: {
				method: 'GET',
				path: '/controller/action'
			},
		});
		expect(endpoints.find(e => e.url.path === '/users')).to.deep.includes({
			namespace: 'default',
			url: {
				method: "GET",
				path: "/users"
			}
		});
		expect(endpoints.find(e => e.url.path === '/data/:version/weather')).to.deep.includes({
			namespace: 'default',
			url: {
				method: 'GET',
				path: '/data/:version/weather'
			},
		});
	});

	it('should generate with defaults', async function () {
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
	});

	it('should generate api client', async function () {
		const path = cwd('output', 'cliApi.js');
		const pathDts = cwd('output', 'cliApi.d.ts');

		remove(path);
		remove(pathDts);

		await exec(`node cli.js -c ${cwd('apidoc.json')} -a ${path} -d ${pathDts} --jsdoc-methods=false --jsdoc-typedefs=false`);

		isExist(path);

		var Api = require(path);
		expect(Api.baseUrl).to.eql('https://samples.openweathermap.org');
		expect(Api.request).to.be.a('function');
		expect(Api.errorHandler).to.be.a('function');

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

		var errN = 0;

		Api.request = function () {
			return {
				statusCode: 210,
				body: n === 0 ? {data: '21x'} : null
			};
		};

		Api.errorHandler = function (err) {
			errN++;

			if (errN === 1) {
				expect(err).to.be.instanceOf(Api.RequestValidationError);
			}
			else {
				expect(err).to.be.instanceOf(Api.ResponseValidationError);
			}
		};

		n = 0;
		await client.app.test1({id: 'asd'}, {r: 200}, {any: 'value'});
		n = 1;
		await client.app.test1({id: 100}, {r: 200}, {any: 'value'});

		expect(errN).to.eql(2);

		n = 0;

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
		expect(n).to.eql(1);
	});

	it('should generate OpenAPI', async function () {
		var path = cwd('output', 'cliOpenAPI.json');

		remove(path);

		await exec(`node cli.js -c ${cwd('apidoc.json')} -o ${path}`);

		isExist(path);

		expect(parseFile(path)).to.eql(parseFile(cwd('static', 'open-api.json')));
	});

	it('should generate endpoints with includeJsdoc', async function () {
		var path = cwd('output', 'jsdoc.json');

		await exec(`node cli.js -c ${cwd('includeJsdoc.json')} -j ${path}`);

		isExist(path);

		var schema1 = parseFile(path);
		var schema2 = parseFile(cwd('static', 'jsdoc.json'));

		expect(schema1).to.have.lengthOf(1);
		expect(schema1[0]).to.have.property('file').which.includes('tests/jsDoc/index.js');

		delete schema1[0].file;

		expect(schema1).to.eql(schema2);
	});

	it('should handle defaultSchemas path', async function () {
		const source = cwd('src', 'def-schemas', 'index.js');
		const target = cwd('output', 'def-schemas.json');

		await exec(`node cli.js -i ${source} --default-schemas ${cwd('static', 'defaultSchemas.js')} -j ${target}`);

		expect(parseFile(target)[0].body.schema).to.eql({
			type: 'object',
			additionalProperties: false,
			required: ['id'],
			properties: {
				id: {
					title: 'test',
					type: 'string',
					const: "test",
				}
			}
		});
	});
});

function cwd(...args) {
	args.unshift(__dirname);

	return resolve.apply(null, args);
}

function isExist(path) {
	if (!existsSync(path)) {
		throw new Error('File not exists: ' + path);
	}
}

function remove(file) {
	if (existsSync(file)) {
		unlinkSync(file);
	}
}

function readFile(path) {
	return readFileSync(path, 'utf-8');
}

function parseFile(path) {
	return JSON.parse(readFile(path));
}