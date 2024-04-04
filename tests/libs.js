const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const {expect} = chai;

describe('libs', function () {
	it('parseComments', function (done) {
		const parseComments = require('../lib/parseComments');
		const {resolve} = require('path');

		parseComments(resolve(__dirname, 'src', 'comments.js'))
		.then(function (list) {
			expect(list).to.have.length(17);
			expect(list).to.eql([
				{
					value: "\n test1\n",
					start: {
						line: 1,
						column: 0
					},
					end: {
						line: 3,
						column: 3
					},
					target: {
						name: "x",
						var: "var"
					}
				},
				{
					value: "\n test2 ",
					start: {
						line: 6,
						column: 1
					},
					end: {
						line: 7,
						column: 12
					}
				},
				{
					value: "\n test3\n",
					start: {
						line: 10,
						column: 0
					},
					end: {
						line: 12,
						column: 4
					}
				},
				{
					value: "\n /** test4 /**\n ",
					start: {
						line: 14,
						column: 0
					},
					end: {
						line: 16,
						column: 5
					}
				},
				{
					value: " test5 ",
					start: {
						line: 18,
						column: 0
					},
					end: {
						line: 18,
						column: 12
					},
					target: {
						name: "t",
						var: "const"
					}
				},
				{
					value: "\n @param a\n",
					start: {
						line: 21,
						column: 1
					},
					end: {
						line: 23,
						column: 4
					},
					target: {
						name: "test1"
					}
				},
				{
					value: "\n @param a\n",
					start: {
						line: 28,
						column: 1
					},
					end: {
						line: 30,
						column: 4
					},
					target: {
						name: "test2",
						async: true
					}
				},
				{
					value: "\n @param a\n",
					start: {
						line: 35,
						column: 1
					},
					end: {
						line: 37,
						column: 4
					},
					target: {
						name: "test3"
					}
				},
				{
					value: "\n @param a\n",
					start: {
						line: 42,
						column: 1
					},
					end: {
						line: 44,
						column: 4
					},
					target: {
						name: "test4",
						async: true
					}
				},
				{
					value: "\n class\n",
					start: {
						line: 50,
						column: 0
					},
					end: {
						line: 52,
						column: 3
					},
					target: {
						name: "Test",
						class: true
					}
				},
				{
					value: "\n @param a\n",
					start: {
						line: 54,
						column: 1
					},
					end: {
						line: 56,
						column: 4
					},
					target: {
						name: "test1"
					}
				},
				{
					value: "\n @param a\n",
					start: {
						line: 61,
						column: 1
					},
					end: {
						line: 63,
						column: 4
					},
					target: {
						name: "test2",
						async: true
					}
				},
				{
					value: "\n @param a\n",
					start: {
						line: 68,
						column: 1
					},
					end: {
						line: 70,
						column: 4
					},
					target: {
						name: "test3",
						static: true
					}
				},
				{
					value: "\n @param a\n",
					start: {
						line: 75,
						column: 1
					},
					end: {
						line: 77,
						column: 4
					},
					target: {
						name: "test3",
						async: true,
						static: true
					}
				},
				{
					value: "\n func\n",
					start: {
						line: 83,
						column: 0
					},
					end: {
						line: 85,
						column: 3
					},
					target: {
						name: "test1",
						function: true
					}
				},
				{
					value: "\n func\n",
					start: {
						line: 90,
						column: 0
					},
					end: {
						line: 92,
						column: 3
					},
					target: {
						name: "test2",
						async: true,
						function: true
					}
				},
				{
					value: "\n func\n",
					start: {
						line: 97,
						column: 0
					},
					end: {
						line: 99,
						column: 3
					},
					target: {
						name: "flet",
						var: "const",
						async: true
					}
				}
			]);

			done();
		})
		.catch(done);
	});

	it('parseAnnotations', function () {
		const parseAnnotations = require('../lib/parseAnnotations');

		var list = parseAnnotations(`
		Some text
		second line
		@test1 some text
		@test-2 some\ntext
		@test_3 some\ntext\ntext\n`);

		expect(list).to.deep.equal([
			{
				name: 'description',
				value: 'Some text\nsecond line',
			},
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

	it('ajvToJsDoc', function () {
		const ajvToJsDoc = require('../lib/ajvToJsDoc');

		var jsdoc = ajvToJsDoc({
			type: 'object',
			required: ['id'],
			properties: {
				id: {type: 'number'},
				"1name": {type: 'string'},
				user_id: {anyOf: [{type: 'number'}, {type: 'null'}]},
			},
		});
		expect(jsdoc).to.eql('{id: number, "1name"?: string, user_id?: ?number}');

		jsdoc = ajvToJsDoc({
			type: 'object',
			required: ['id'],
			properties: {
				id: {type: 'number'},
				$name: {type: 'string'},
				_user_id: {anyOf: [{type: 'number'}, {type: 'null'}]},
			},
		}, {jsDocNull: false});
		expect(jsdoc).to.eql('{id: number, $name?: string, _user_id?: number|null}');

		jsdoc = ajvToJsDoc({type: 'array'});
		expect(jsdoc).to.eql('Array<*>');

		jsdoc = ajvToJsDoc({type: 'array'}, {any: 'any'});
		expect(jsdoc).to.eql('Array<any>');

		jsdoc = ajvToJsDoc({type: 'array', items: {type: 'string'}});
		expect(jsdoc).to.eql('Array<string>');

		jsdoc = ajvToJsDoc({anyOf: [{type: 'object'}, {type: 'null'}]});
		expect(jsdoc).to.eql('?Object');

		jsdoc = ajvToJsDoc({anyOf: [{type: 'object'}, {type: 'number'}]});
		expect(jsdoc).to.eql('Object|number');

		jsdoc = ajvToJsDoc({anyOf: [{type: 'number'}, {type: 'number'}, {type: 'string'}]});
		expect(jsdoc).to.eql('number|string');

		jsdoc = ajvToJsDoc({
			anyOf: [
				{type: 'number', enum: [1, 2]},
				{type: 'number', enum: [3, 4]},
				{type: 'string', enum: ['1', '2']},
				{type: 'null'}
			]
		});
		expect(jsdoc).to.eql('1|2|3|4|"1"|"2"|*');

		jsdoc = ajvToJsDoc({
			anyOf: [
				{const: 1},
				{const: '2'},
				{type: 'null'}
			]
		});
		expect(jsdoc).to.eql('1|"2"|*');

		jsdoc = ajvToJsDoc({
			type: 'object',
			required: [],
			properties: {
				test: {const: 'asd'}
			}
		});
		expect(jsdoc).to.eql(`{test?: "asd"}`);

		jsdoc = ajvToJsDoc({
			type: 'object',
			required: [],
			properties: {
				test: {type: 'string', enum: ['a', '2']}
			}
		});
		expect(jsdoc).to.eql(`{test?: "a"|"2"}`);

		jsdoc = ajvToJsDoc({
			type: 'object',
			patternProperties: {
				"^\\d+$": {
					type: 'object',
					required: [],
					properties: {
						test: {type: 'string'}
					}
				},
			}
		});
		expect(jsdoc).to.eql('{[prop: number]: {test?: string}}');

		jsdoc = ajvToJsDoc({
			type: 'object',
			patternProperties: {
				"^\\d+$": {type: 'string'},
				"^\\d$": {type: 'string'},
				"^\\w+$": {type: 'string'},
			}
		});
		expect(jsdoc).to.eql('{[prop1: number]: string, [prop2: number]: string, [prop3: string]: string}');

		jsdoc = ajvToJsDoc({
			type: 'object',
			properties: {
				test: {type: 'string'}
			},
			patternProperties: {
				"^\\d+$": {type: 'string'},
			}
		});
		expect(jsdoc).to.eql('{test?: string, [prop: number]: string}');
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
		const parser = require('adv-parser');
		const defaultSchemas = require('adv-parser/schemas');
		const schemas = {...defaultSchemas};
		const parseSchema = function (code) {
			return parser(code, {schemas});
		};

		const params = require('../lib/annotations/params');
		const query = require('../lib/annotations/query');
		const body = require('../lib/annotations/body');
		const file = require('../lib/annotations/file');
		const files = require('../lib/annotations/files');
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

		data = file.prepare(code);
		data.schema = parseSchema(data.schema);
		data = file(data);

		expect(data).to.eql({
			schema: parseSchema(code),
		});

		data = files.prepare(code);
		data.schema = parseSchema(data.schema);
		data = files(data);

		expect(data).to.eql({
			schema: parseSchema(code),
		});

		data = body.prepare('# Desc\n' + code);
		data.schema = parseSchema(data.schema);
		data = body(data);

		expect(data).to.eql({
			schema: parseSchema('# Desc\n' + code),
		});

		expect(data.schema).to.have.property('description').that.to.eql('Desc');

		code = `Schema = ${code}`;

		data = schema.prepare(code);
		data.schema = parseSchema(data.schema);
		data = schema(data);
		expect(data).to.eql({
			local: false,
			name: 'Schema',
			schema: parseSchema(code),
		});

		data = schema.prepare(' let $' + code);
		data.schema = parseSchema(data.schema);
		data = schema(data);
		expect(data).to.eql({
			local: true,
			name: '$Schema',
			schema: parseSchema('$' + code),
		});

		data = schema.prepare(() => Test.Schema = {id: number});
		expect(data).to.have.property('name', 'Test.Schema');
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

		data = call(() => test.action(id, user));

		expect(data).to.eql({
			code: `test.action(id, user)`,
			method: 'test.action',
			parts: ['test', 'action'],
			params: ['id', 'user'],
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

		data = response.prepare(`200 || 3xx || 400 - 500\n# Desc\n User = {id: uuid}`);

		expect(data).to.eql({
			code: {
				anyOf: [
					{
						type: 'number',
						const: 200,
					},
					{
						title: '3xx',
						type: 'string',
						pattern: '^3\\d\\d$',
					},
					{
						title: '400 - 500',
						type: 'number',
						minimum: 400,
						maximum: 500,
					},
				]
			},
			schema: `# Desc\n User = {id: uuid}`,
		});

		data = response.prepare(() => User = {id: uuid}, {defaultCode: `200 || 3xx || 400 - 500`});

		expect(data).to.eql({
			code: {
				anyOf: [
					{
						type: 'number',
						const: 200,
					},
					{
						title: '3xx',
						type: 'string',
						pattern: '^3\\d\\d$',
					},
					{
						title: '400 - 500',
						type: 'number',
						minimum: 400,
						maximum: 500,
					},
				]
			},
			schema: `() => User = {id: uuid}`,
		});
	});
});