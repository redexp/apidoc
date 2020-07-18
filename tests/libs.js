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
				date: date-time-tz,
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
				any_of: number || string || int,
				all_of: number && string && int,
			}
		`);

		expect(res).to.equal(`{
  "type": "object",
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
      "format": "date-time"
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
  "required": ["test3"],
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

	it(`OBJECT_NAME && OBJECT_NAME`, function () {
		parseSchema(`One = {test1: string}`);
		parseSchema(`Two = {test2: string}`);
		parseSchema(`Three = {test3: string}`);

		var res = parseSchema(`AllOf = One && Two && Three`);

		expect(res).to.equal(parseSchema('AllOf')).and.to.equal(`{
  "allOf": [{
    "type": "object",
    "required": ["test1"],
    "properties": {
      test1: {
        "type": "string"
      }
    }
  }, {
    "type": "object",
    "required": ["test2"],
    "properties": {
      test2: {
        "type": "string"
      }
    }
  }, {
    "type": "object",
    "required": ["test3"],
    "properties": {
      test3: {
        "type": "string"
      }
    }
  }]
}`);
		res = parseSchema(`AnyOf = One || Two || Three`);

		expect(res).to.equal(parseSchema('AnyOf')).and.to.equal(`{
  "anyOf": [{
    "type": "object",
    "required": ["test1"],
    "properties": {
      test1: {
        "type": "string"
      }
    }
  }, {
    "type": "object",
    "required": ["test2"],
    "properties": {
      test2: {
        "type": "string"
      }
    }
  }, {
    "type": "object",
    "required": ["test3"],
    "properties": {
      test3: {
        "type": "string"
      }
    }
  }]
}`);
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

		expect(res).to.equal(`{
  "type": "object",
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
}`);
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