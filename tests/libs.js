const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const {expect} = chai;
const {getDefaultSchemas} = require('../lib/schemas');

describe('libs', function () {
	it('parseAnnotations', function () {
		const parseAnnotations = require('../lib/parseAnnotations');

		var list = parseAnnotations(`
		@test1 some text
		@test-2 some\ntext
		@test_3 some\ntext\ntext\n`);

		expect(list).to.deep.equal([
			{
				name: 'test1',
				value: ' some text',
			},
			{
				name: 'test-2',
				value: " some\ntext",
			},
			{
				name: 'test_3',
				value: " some\ntext\ntext",
			},
		]);

		list = parseAnnotations(`
		* 
		* @test1 some text
		* @test-2 some\ntext
		* @test_3 some\ntext\ntext
		* 
		*`);

		expect(list).to.deep.equal([
			{
				name: 'test1',
				value: ' some text',
			},
			{
				name: 'test-2',
				value: " some\ntext",
			},
			{
				name: 'test_3',
				value: " some\ntext\ntext",
			},
		]);
	});

	it('parseEndpoint', function () {
		const parseEndpoint = require('../lib/parseEndpoint');

		var res = parseEndpoint([
			{
				name: 'url',
				value: '/test'
			},
			{
				name: 'param',
				value: 'name'
			}
		]);

		expect(res).to.shallowDeepEqual({
			namespace: 'default',
			url: {
				method: 'GET',
				path: '/test',
			}
		});

		expect(() => parseEndpoint([
			{
				name: 'url',
				value: '/test'
			},
			{
				name: 'test',
				value: 'name'
			}
		])).to.throw('Unknown annotation "test"');
	});
});

describe('parseSchema', function () {
	const parseSchema = require('../lib/parseSchema');
	const {getAstSchema, generateAjvSchema, resetCache} = parseSchema;

	beforeEach(function () {
		resetCache(getDefaultSchemas());
	});

	it('json-schema', function () {
		var res = parseSchema(`
			{
				id: number,
				name: string,
				date: date-time-tz,
				[optional]: string,
				listInt: [int],
				listStr: [{
					type: 'string'
				}],
				listObj: [{
					type: string
				}],
				enumInt: 1 || 2 || 3,
				enumStr: "user" || 'account' || "item",
				any_of: number || string || int,
				all_of: number && string && int,
			}
		`);

		expect(res).to.eql({
			"type": "object",
			"additionalProperties": false,
			"required": ["id", "name", "date", "listInt", "listStr", "listObj", "enumInt", "enumStr", "any_of", "all_of"],
			"properties": {
				id: {
					"type": "number"
				},
				name: {
					"type": "string"
				},
				date: {
					"type": "string",
					pattern: "^\\d{4}-[01]\\d-[0-3]\\d[tT\\s](?:[0-2]\\d:[0-5]\\d:[0-5]\\d|23:59:60)(?:\\.\\d+)?(?:z|[+-]\\d{2}(?::?\\d{2})?)$",
				},
				optional: {
					"type": "string"
				},
				listInt: {
					"type": "array",
					"items": {
						"type": "integer"
					}
				},
				listStr: {
					"type": "array",
					"items": {
						type: "string"
					}
				},
				listObj: {
					"type": "array",
					"items": {
						"type": "object",
						"additionalProperties": false,
						"required": ["type"],
						"properties": {
							type: {
								"type": "string"
							}
						}
					}
				},
				enumInt: {
					"type": "number",
					"enum": [1, 2, 3]
				},
				enumStr: {
					"type": "string",
					"enum": ["user", "account", "item"]
				},
				any_of: {
					"anyOf": [{
						"type": "number"
					}, {
						"type": "string"
					}, {
						"type": "integer"
					}]
				},
				all_of: {
					"allOf": [{
						"type": "number"
					}, {
						"type": "string"
					}, {
						"type": "integer"
					}]
				}
			}
		});
	});

	it('OBJECT_NAME = json-schema', function () {
		var res;

		res = parseSchema(`Schema = {test1: string}`);
		expect(parseSchema.cache).to.property('Schema');
		expect(res).to.eql({
			"type": "object",
			"additionalProperties": false,
			"required": ["test1"],
			"properties": {
				test1: {
					"type": "string"
				}
			}
		});


		res = parseSchema(`Schema.field = {test2: string}`);
		expect(parseSchema.cache).to.property('Schema.field');
		expect(res).to.eql({
			"type": "object",
			"additionalProperties": false,
			"required": ["test2"],
			"properties": {
				test2: {
					"type": "string"
				}
			}
		});

		res = parseSchema(`Schema.field1.field2 = {test3: string}`);
		expect(parseSchema.cache).to.property('Schema.field1.field2');
		expect(res).to.eql({
			"type": "object",
			"additionalProperties": false,
			"required": ["test3"],
			"properties": {
				test3: {
					"type": "string"
				}
			}
		});
	});

	it('OBJECT_NAME', function () {
		parseSchema(`Schema = {test1: string}`);
		parseSchema(`Schema.field = {test2: string}`);
		parseSchema(`Schema.field1.field2 = {test3: string}`);

		var res;

		res = parseSchema(`Schema`);
		expect(res).to.eql({
			"type": "object",
			"additionalProperties": false,
			"required": ["test1"],
			"properties": {
				test1: {
					"type": "string"
				}
			}
		});

		res = parseSchema(`Schema.field`);
		expect(res).to.eql({
			"type": "object",
			"additionalProperties": false,
			"required": ["test2"],
			"properties": {
				test2: {
					"type": "string"
				}
			}
		});

		res = parseSchema(`Schema.field1.field2`);
		expect(res).to.eql({
			"type": "object",
			"additionalProperties": false,
			"required": ["test3"],
			"properties": {
				test3: {
					"type": "string"
				}
			}
		});
	});

	it('OBJECT_NAME = OBJECT_NAME', function () {
		parseSchema(`AnotherSchema = {test1: string}`);
		parseSchema(`AnotherSchema.field = {test2: string}`);
		parseSchema(`AnotherSchema.field1.field2 = {test3: string}`);

		var test1 = {
			"type": "object",
			"additionalProperties": false,
			"required": ["test1"],
			"properties": {
				test1: {
					"type": "string"
				}
			}
		};
		var test2 = {
			"type": "object",
			"additionalProperties": false,
			"required": ["test2"],
			"properties": {
				test2: {
					"type": "string"
				}
			}
		};
		var test3 = {
			"type": "object",
			"additionalProperties": false,
			"required": ["test3"],
			"properties": {
				test3: {
					"type": "string"
				}
			}
		};

		var res;

		res = parseSchema(`Schema = AnotherSchema`);
		expect(res).to.eql(test1);
		res = parseSchema(`Schema`);
		expect(res).to.eql(test1);

		res = parseSchema(`Schema.field = AnotherSchema`);
		expect(res).to.eql(test1);
		res = parseSchema(`Schema.field`);
		expect(res).to.eql(test1);

		res = parseSchema(`Schema.field1.field2 = AnotherSchema`);
		expect(res).to.eql(test1);
		res = parseSchema(`Schema.field1.field2`);
		expect(res).to.eql(test1);

		res = parseSchema(`Schema = AnotherSchema.field`);
		expect(res).to.eql(test2);
		res = parseSchema(`Schema`);
		expect(res).to.eql(test2);

		res = parseSchema(`Schema = AnotherSchema.field1.field2`);
		expect(res).to.eql(test3);
		res = parseSchema(`Schema`);
		expect(res).to.eql(test3);

		res = parseSchema(`Schema.field = AnotherSchema.field`);
		expect(res).to.eql(test2);
		res = parseSchema(`Schema.field`);
		expect(res).to.eql(test2);

		res = parseSchema(`Schema.field1.field2 = AnotherSchema.field`);
		expect(res).to.eql(test2);
		res = parseSchema(`Schema.field1.field2`);
		expect(res).to.eql(test2);

		res = parseSchema(`Schema.field = AnotherSchema.field1.field2`);
		expect(res).to.eql(test3);
		res = parseSchema(`Schema.field`);
		expect(res).to.eql(test3);

		res = parseSchema(`Schema.field1.field2 = AnotherSchema.field1.field2`);
		expect(res).to.eql(test3);
		res = parseSchema(`Schema.field1.field2`);
		expect(res).to.eql(test3);
	});

	it(`OBJECT_NAME && OBJECT_NAME`, function () {
		parseSchema(`One = {test1: string}`);
		parseSchema(`Two = {test2: string}`);
		parseSchema(`Three = {test3: string}`);

		var res = parseSchema(`AllOf = One && Two && Three`);

		expect(res).to.eql(parseSchema('AllOf')).and.to.eql({
			"allOf": [{
				"type": "object",
				"additionalProperties": false,
				"required": ["test1"],
				"properties": {
					test1: {
						"type": "string"
					}
				}
			}, {
				"type": "object",
				"additionalProperties": false,
				"required": ["test2"],
				"properties": {
					test2: {
						"type": "string"
					}
				}
			}, {
				"type": "object",
				"additionalProperties": false,
				"required": ["test3"],
				"properties": {
					test3: {
						"type": "string"
					}
				}
			}]
		});
		res = parseSchema(`AnyOf = One || Two || Three`);

		expect(res).to.eql(parseSchema('AnyOf')).and.to.eql({
			"anyOf": [{
				"type": "object",
				"additionalProperties": false,
				"required": ["test1"],
				"properties": {
					test1: {
						"type": "string"
					}
				}
			}, {
				"type": "object",
				"additionalProperties": false,
				"required": ["test2"],
				"properties": {
					test2: {
						"type": "string"
					}
				}
			}, {
				"type": "object",
				"additionalProperties": false,
				"required": ["test3"],
				"properties": {
					test3: {
						"type": "string"
					}
				}
			}]
		});
	});

	it(`Extend schema`, function () {
		parseSchema(`One = {test1: string, field: string}`);
		parseSchema(`Two = {test1: number, name: string}`);
		parseSchema(`Three = {test3: string, [test4]: string, [wasReq]: string, [wasOpt]: string}`);
		parseSchema(`Four = {type: "object", testOption1: "test1", testOption2: "test2"}`);
		parseSchema(`Five = {type: "object", testOption1: "testA", testOption3: "test3", properties: {test5: {type: "string"}}}`);

		var res = parseSchema(`{
			id: number,
			field: number,
			wasReq: number,
			...One,
			...Two,
			...Three,
			...Four,
			...Five,
			name: undefined,
			wasOpt: number,
			date: string,
		}`);

		expect(res).to.eql({
			"type": "object",
			"additionalProperties": false,
			"required": ["id", "field", "test1", "test3", "wasOpt", "date"],
			"properties": {
				id: {
					"type": "number"
				},
				field: {
					"type": "string"
				},
				test1: {
					"type": "number"
				},
				test3: {
					"type": "string"
				},
				test4: {
					"type": "string"
				},
				wasReq: {
					"type": "string"
				},
				test5: {
					type: "string"
				},
				wasOpt: {
					"type": "number"
				},
				date: {
					"type": "string"
				}
			},
			testOption1: "testA",
			testOption2: "test2",
			testOption3: "test3"
		});
	});

	it('deps', function () {
		const cache = getDefaultSchemas();

		var schema1 = getAstSchema(`{id: Test}`, cache);
		var schema2 = getAstSchema(`Test = {type: "number"}`, cache);

		var res = generateAjvSchema(schema1, cache);

		expect(res).to.eql({
			type: 'object',
			"additionalProperties": false,
			required: ['id'],
			properties: {
				id: {
					type: 'number'
				}
			}
		});

		res = generateAjvSchema(schema2, cache);

		expect(res).to.eql({
			type: 'number'
		});
	});

	it('extend {...{},}', function () {
		var schema = parseSchema(`
			{
				...{
					name: string,
				},
				type: "object",
				additionalProperties: true,
			}
		`);

		expect(schema).to.eql({
			type: 'object',
			additionalProperties: true,
			required: ['name'],
			properties: {
				name: {
					type: 'string'
				}
			}
		});

		schema = parseSchema(`
			{
				type: "object",
				additionalProperties: true,
				extra: "test",
				...{
					name: string,
				},
			}
		`);

		expect(schema).to.eql({
			type: 'object',
			additionalProperties: false,
			extra: "test",
			required: ['name'],
			properties: {
				name: {
					type: 'string'
				}
			}
		});

		schema = parseSchema(`
			{
				type: "object",
				...{
					name: string,
				},
				additionalProperties: true,
				...{
					id: number,
					name: number,
				},
			}
		`);

		expect(schema).to.eql({
			type: 'object',
			additionalProperties: false,
			required: ['name', 'id'],
			properties: {
				id: {
					type: 'number'
				},
				name: {
					type: 'number'
				}
			}
		});

		schema = parseSchema(`
			{
				...string,
				type: "string",
				extra: 'test',
			}
		`);

		expect(schema).to.eql({
			type: 'string',
			extra: 'test',
		});
	});
});

describe('annotations', function () {
	it('url', function () {
		const url = require('../lib/annotations/url');

		var value = ` post /users/:id`;
		var item = url(value);

		expect(item).to.deep.include({
			method: 'POST',
			path: '/users/:id',
		});

		value = `/users/:id`;
		item = url(value);

		expect(item).to.deep.include({
			method: 'GET',
			path: '/users/:id',
		});

		item = url(value, {defaultMethod: 'post'});

		expect(item).to.deep.include({
			method: 'POST',
			path: '/users/:id',
		});
	});

	it('params, query, body, schema', function () {
		const parseSchema = require('../lib/parseSchema');
		parseSchema.resetCache(getDefaultSchemas());

		const params = require('../lib/annotations/params');
		const query = require('../lib/annotations/query');
		const body = require('../lib/annotations/body');
		const schema = require('../lib/annotations/schema');

		var code = '{id: number}';

		var data = params.prepare(code);
		data.schema = parseSchema(data.schema);
		data = params(data);

		expect(data).to.eql({
			schema: parseSchema(code),
			names: ['id'],
		});

		data = query.prepare(code);
		data.schema = parseSchema(data.schema);
		data = query(data);

		expect(data).to.eql({
			schema: parseSchema(code),
			names: ["id"],
		});

		data = body.prepare(code);
		data.schema = parseSchema(data.schema);
		data = body(data);

		expect(data).to.eql({
			schema: parseSchema(code),
		});

		data = schema.prepare(code);
		data.schema = parseSchema(data.schema);
		data = schema(data);

		expect(data).to.eql({
			schema: parseSchema(code),
		});
	});

	it('call', function () {
		const call = require('../lib/annotations/call');

		var data = call(`app.method(id, test)`);

		expect(data).to.eql({
			code: `app.method(id, test)`,
			method: 'app.method',
			parts: ['app', 'method'],
			params: ['id', 'test'],
		});
	});

	it('response', function () {
		const response = require('../lib/annotations/response');

		var data = response.prepare(`{id: number}`);

		expect(data).to.eql({
			code: {
				type: 'number',
				const: 200,
			},
			schema: `{id: number}`,
		});

		data = response.prepare(`300 {id: int}`);

		expect(data).to.eql({
			code: {
				type: 'number',
				const: 300,
			},
			schema: `{id: int}`,
		});

		data = response.prepare(`200 || 3xx || 400 - 500 User = {id: uuid}`);

		expect(data).to.eql({
			code: {
				anyOf: [
					{
						type: 'number',
						const: 200,
					},
					{
						type: 'string',
						pattern: '^3\\d\\d$',
					},
					{
						type: 'number',
						minimum: 400,
						maximum: 500,
					},
				]
			},
			schema: `User = {id: uuid}`,
		});
	});
});

describe('schemas', function () {
	const Ajv = require('ajv').default;
	const ajv = new Ajv();
	require('ajv-formats')(ajv);

	it('string', function () {
		var schema = require('../lib/schemas/string');
		var test = ajv.compile(schema);

		test('');
		expect(test.errors).to.be.null;

		test('text');
		expect(test.errors).to.be.null;

		test(1);
		expect(test.errors).to.have.length(1);
	});

	it('number', function () {
		var schema = require('../lib/schemas/number');
		var test = ajv.compile(schema);

		test(1);
		expect(test.errors).to.be.null;

		test(0);
		expect(test.errors).to.be.null;

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('int', function () {
		var schema = require('../lib/schemas/int');
		var test = ajv.compile(schema);

		test(1);
		expect(test.errors).to.be.null;

		test(-1);
		expect(test.errors).to.be.null;

		test(1.5);
		expect(test.errors).to.have.length(1);
	});

	it('positive', function () {
		var schema = require('../lib/schemas/positive');
		var test = ajv.compile(schema);

		test(1);
		expect(test.errors).to.be.null;

		test(0);
		expect(test.errors).to.be.null;

		test(-1);
		expect(test.errors).to.have.length(1);
	});

	it('negative', function () {
		var schema = require('../lib/schemas/negative');
		var test = ajv.compile(schema);

		test(-1);
		expect(test.errors).to.be.null;

		test(0);
		expect(test.errors).to.have.length(1);

		test(1);
		expect(test.errors).to.have.length(1);
	});

	it('id', function () {
		var schema = require('../lib/schemas/id');
		var test = ajv.compile(schema);

		test(1);
		expect(test.errors).to.be.null;

		test(0);
		expect(test.errors).to.have.length(1);

		test(-1);
		expect(test.errors).to.have.length(1);
	});

	it('boolean', function () {
		var schema = require('../lib/schemas/boolean');
		var test = ajv.compile(schema);

		test(true);
		expect(test.errors).to.be.null;
		test(false);
		expect(test.errors).to.be.null;

		test(0);
		expect(test.errors).to.have.length(1);

		test(null);
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('date', function () {
		var schema = require('../lib/schemas/date');
		var test = ajv.compile(schema);

		test('2000-01-01');
		expect(test.errors).to.be.null;

		test('2000-01-01 10:10:10');
		expect(test.errors).to.have.length(1);

		test('2000-01-01T10:10:10');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('time', function () {
		var schema = require('../lib/schemas/time');
		var test = ajv.compile(schema);

		test('10:10:10');
		expect(test.errors).to.be.null;

		test('2000-01-01 10:10:10');
		expect(test.errors).to.have.length(1);

		test('2000-01-01T10:10:10');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('date-time', function () {
		var schema = require('../lib/schemas/date-time');
		var test = ajv.compile(schema);

		test('2000-01-01 10:10:10');
		expect(test.errors).to.be.null;

		test('2000-01-01T10:10:10');
		expect(test.errors).to.be.null;

		test('2000-01-01');
		expect(test.errors).to.have.length(1);

		test('10:10:10');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('date-time-tz', function () {
		var schema = require('../lib/schemas/date-time-tz');
		var test = ajv.compile(schema);

		test('2000-01-01 10:10:10+02');
		expect(test.errors).to.be.null;

		test('2000-01-01T10:10:10+02');
		expect(test.errors).to.be.null;

		test('2000-01-01T10:10:10');
		expect(test.errors).to.have.length(1);

		test('10:10:10');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('email', function () {
		var schema = require('../lib/schemas/email');
		var test = ajv.compile(schema);

		test('test@mail.com');
		expect(test.errors).to.be.null;

		test('testmail.com');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('hostname', function () {
		var schema = require('../lib/schemas/hostname');
		var test = ajv.compile(schema);

		test('domain.com');
		expect(test.errors).to.be.null;

		test('http://domain.com');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('filename', function () {
		var schema = require('../lib/schemas/filename');
		var test = ajv.compile(schema);

		test('file-name.ext1');
		expect(test.errors).to.be.null;

		test('dir/file.ext');
		expect(test.errors).to.have.length(1);

		test('../file.ext');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('ipv4', function () {
		var schema = require('../lib/schemas/ipv4');
		var test = ajv.compile(schema);

		test('1.1.1.1');
		expect(test.errors).to.be.null;

		test('255.255.255.255');
		expect(test.errors).to.be.null;

		test('1');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('ipv6', function () {
		var schema = require('../lib/schemas/ipv6');
		var test = ajv.compile(schema);

		test('2001:0db8:11a3:09d7:1f34:8a2e:07a0:765d');
		expect(test.errors).to.be.null;

		test('255.255.255.255');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});

	it('regex', function () {
		var schema = require('../lib/schemas/regex');
		var test = ajv.compile(schema);

		test('^\\d$');
		expect(test.errors).to.be.null;

		test('(');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.be.null;
	});

	it('uuid', function () {
		var schema = require('../lib/schemas/uuid');
		var test = ajv.compile(schema);

		test('00000000-1111-2222-3333-000000000000');
		expect(test.errors).to.be.null;

		test('00000000-1111-2222-3333');
		expect(test.errors).to.have.length(1);

		test('');
		expect(test.errors).to.have.length(1);
	});
});

describe('generate', function () {
	it('express', function (done) {
		this.timeout(5000);

		const filesToEndpoints = require('../lib/filesToEndpoints');
		const generator = require('../lib/generate/expressMiddleware');
		const {resolve} = require('path');
		const {application, request, response} = require('express');

		filesToEndpoints([resolve(__dirname, 'src', 'src1.js'), resolve(__dirname, 'src', 'sub1', 'sub2', 'sub2.js')])
			.then(function (endpoints) {
				generator(resolve(__dirname, 'output', 'expressMiddleware.js'), {
					endpoints
				});
			})
			.then(async function () {
				const test = require('./output/expressMiddleware');

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
			.then(done)
			.catch(done);
	});
});