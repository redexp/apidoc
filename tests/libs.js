const {expect} = require('chai');
const schemas = require('../lib/schemas');

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
});

describe('parseSchema', function () {
	const parseSchema = require('../lib/parseSchema');

	beforeEach(function () {
		schemas.reset();
	});

	it('json-schema', function () {
		var res = parseSchema(`
			{
				id: number,
				name: string,
				[optional]: string,
				listInt: [int],
				listStr: [{
					type: "string"
				}],
				listObj: [{
					type: string
				}],
				enumInt: 1 || 2 || 3,
				enumStr: "user" || "account" || "item",
			}
		`);

		expect(res).to.equal(`{
  "type": "object",
  "required": ["id", "name", "listInt", "listStr", "listObj", "enumInt", "enumStr"],
  "properties": {
    id: {
      "type": "number"
    },
    name: {
      "type": "string"
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
    }
  }
}`);
	});

	it('OBJECT_NAME = json-schema', function () {
		var res;

		res = parseSchema(`Schema = {test1: string}`);
		expect(!!schemas.getAst('Schema')).to.be.true;
		expect(res).to.equal(`{
  "type": "object",
  "required": ["test1"],
  "properties": {
    test1: {
      "type": "string"
    }
  }
}`);


		res = parseSchema(`Schema.field = {test2: string}`);
		expect(!!schemas.getAst('Schema.field')).to.be.true;
		expect(res).to.equal(`{
  "type": "object",
  "required": ["test2"],
  "properties": {
    test2: {
      "type": "string"
    }
  }
}`);

		res = parseSchema(`Schema.field1.field2 = {test3: string}`);
		expect(!!schemas.getAst('Schema.field1.field2')).to.be.true;
		expect(res).to.equal(`{
  "type": "object",
  "required": ["test3"],
  "properties": {
    test3: {
      "type": "string"
    }
  }
}`);
	});

	it('OBJECT_NAME', function () {
		parseSchema(`Schema = {test1: string}`);
		parseSchema(`Schema.field = {test2: string}`);
		parseSchema(`Schema.field1.field2 = {test3: string}`);

		var res;

		res = parseSchema(`Schema`);
		expect(res).to.equal(`{
  "type": "object",
  "required": ["test1"],
  "properties": {
    test1: {
      "type": "string"
    }
  }
}`);

		res = parseSchema(`Schema.field`);
		expect(res).to.equal(`{
  "type": "object",
  "required": ["test2"],
  "properties": {
    test2: {
      "type": "string"
    }
  }
}`);

		res = parseSchema(`Schema.field1.field2`);
		expect(res).to.equal(`{
  "type": "object",
  "required": ["test3"],
  "properties": {
    test3: {
      "type": "string"
    }
  }
}`);
	});

	it('OBJECT_NAME = OBJECT_NAME', function () {
		parseSchema(`AnotherSchema = {test1: string}`);
		parseSchema(`AnotherSchema.field = {test2: string}`);
		parseSchema(`AnotherSchema.field1.field2 = {test3: string}`);

		var test1 = `{
  "type": "object",
  "required": ["test1"],
  "properties": {
    test1: {
      "type": "string"
    }
  }
}`;
		var test2 = `{
  "type": "object",
  "required": ["test2"],
  "properties": {
    test2: {
      "type": "string"
    }
  }
}`;
		var test3 = `{
  "type": "object",
  "required": ["test2"],
  "properties": {
    test3: {
      "type": "string"
    }
  }
}`;

		var res;

		res = parseSchema(`Schema = AnotherSchema`);
		expect(res).to.equal(test1);
		res = parseSchema(`Schema`);
		expect(res).to.equal(test1);

		res = parseSchema(`Schema.field = AnotherSchema`);
		expect(res).to.equal(test1);
		res = parseSchema(`Schema.field`);
		expect(res).to.equal(test1);

		res = parseSchema(`Schema.field1.field2 = AnotherSchema`);
		expect(res).to.equal(test1);
		res = parseSchema(`Schema.field1.field2`);
		expect(res).to.equal(test1);

		res = parseSchema(`Schema = AnotherSchema.field`);
		expect(res).to.equal(test2);
		res = parseSchema(`Schema`);
		expect(res).to.equal(test2);

		res = parseSchema(`Schema = AnotherSchema.field1.field2`);
		expect(res).to.equal(test3);
		res = parseSchema(`Schema`);
		expect(res).to.equal(test3);

		res = parseSchema(`Schema.field = AnotherSchema.field`);
		expect(res).to.equal(test2);
		res = parseSchema(`Schema.field`);
		expect(res).to.equal(test2);

		res = parseSchema(`Schema.field1.field2 = AnotherSchema.field`);
		expect(res).to.equal(test2);
		res = parseSchema(`Schema.field1.field2`);
		expect(res).to.equal(test2);

		res = parseSchema(`Schema.field = AnotherSchema.field1.field2`);
		expect(res).to.equal(test3);
		res = parseSchema(`Schema.field`);
		expect(res).to.equal(test3);

		res = parseSchema(`Schema.field1.field2 = AnotherSchema.field1.field2`);
		expect(res).to.equal(test3);
		res = parseSchema(`Schema.field1.field2`);
		expect(res).to.equal(test3);
	});

	it('OBJECT_NAME = TERNARY', function () {
		const ternary = `{properties: {type: "user"}} ? User : {uuid: string}`;

		parseSchema(`Schema = ${ternary}`);
		parseSchema(`Schema.field = ${ternary}`);
		parseSchema(`Schema.field1.field2 = ${ternary}`);
	});
});

describe('annotations', function () {
	it('url', function () {
		const url = require('../lib/annotations/url');

		var value = ` POST /users/:id`;
		var item = url(value);

		expect(item).to.deep.include({
			method: 'POST',
			path: '/users/:id',
		});

		expect(item.params).to.have.lengthOf(1);
		expect(item.params[0]).to.deep.include({
			name: 'id'
		});
	});
});