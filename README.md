# api-doc-validator

[![Build Status](https://travis-ci.org/redexp/apidoc.svg?branch=master)](https://travis-ci.org/redexp/apidoc)

## Annotations

 * [@url](#url)
 * [@params](#params)
 * [@query](#query)
 * [@body](#body)
 * [@response](#response)
 * [@namespace](#namespace)
 * [@schema](#schema)
 * [@call](#call)
 
## Parameters of annotations

 * [METHOD](#method)
 * [CODE](#CODE)
 * [path](#path)
 * [OBJECT_NAME](#object_name)
 * [json-schema](#json-schema)
   * [Optional object fields](#optional-object-fields)
   * [Number patterns](#number-patterns)
   * [String patterns](#string-patterns)
   * [Inject external schema](#inject-external-schema)
   * [anyOf schema](#anyof-schema)
   * [allOf schema](#allof-schema)
   * [Extend schema](#extend-schema)
 * [object-method-call](#object-method-call)
 
Parameter in brackets means it's optional, like `[CODE]`. Parameters with pipe sign `|` means `or`, like `json-schema|OBJECT_NAME`.

## Usage

 * [cli](#cli)
 * [API client](#api-client)
 * [Express middleware](#express-middleware)
 * [Universal middleware](#universal-middleware)
 * [Config](#config)

## @url

```
@url [METHOD] path
```

```javascript
/**
 * @url POST /path/:param
 */
```

## @params

Validate parameters of `@url` `path`

```
@params [OBJECT_NAME =] json-schema|OBJECT_NAME
```

```javascript
/**
 * @url GET /users/:id
 * @params {
 *     id: number,
 * }
 * @call users.get(id)
 */
```
or with `OBJECT_NAME` assing for future use
```javascript
/**
 * @url GET /users/:id
 * @params User = {
 *     id: number,
 * }
 */
```
or use external schema as root schema
```javascript
/**
 * @url GET /users/:id
 * @params User
 */
```
or extend external schema
```javascript
/**
 * @url GET /users/:id
 * @params {
 *     ...User,
 *     name: string,
 * }
 */
```

## @query

Validate `@url` query parameters

```
@query [OBJECT_NAME =] json-schema|OBJECT_NAME
```

```javascript
/**
 * @url GET /users
 * @query {
 *     id: number,
 * }
 * @call users.get(id)
 */
```
Example of valid request `GET /users?id=1`

Names of fields in `@params` and `query` should be different to use them in `@call`
```javascript
/**
 * @url GET /users/:id
 * @params {
 *     id: number,
 * }
 * @query {
 *     name: string,
 * }
 * @call users.get(id, name)
 */
```

## @body

```
@body [OBJECT_NAME =] json-schema|OBJECT_NAME
```

```javascript
/**
 * @body {
 *     id: number,
 *     name: string,
 * }
 */
```

## @response

Response http code and validation of response body.

```
@response [CODE] [OBJECT_NAME =] json-schema|OBJECT_NAME
```
Response for `200` code
```javascript
/**
 * @response {
 *     id: number,
 *     name: string,
 * }
 */
```
Validators for different codes of same request
```javascript
/**
 * @response 200 {
 *     id: number,
 *     name: string,
 * }
 * @response 500 {
 *     message: string,
 * }
 */
```

## @namespace

Word used to filter validators in target file. You can use shortcut `@ns`

```js
/**
 * Namespace for this validator will be "default"
 * 
 * @url POST /users
 * @body {id: number}
 */

/**
 * @namespace test
 * @url POST /test-success
 * @response 2xx {success: boolean}
 */

/**
 * @ns test
 * @url POST /test-error
 * @response 5xx {error: boolean}
 */
```
Example of generation express middleware with only `test` validators
```
npx adv -c path/to/config.json -n test -e ./test-validator.js
```

## @schema

Define the new schema for future usage

```
@schema OBJECT_NAME = json-schema|OBJECT_NAME
```

```javascript
/**
 * @schema User = {
 *     id: number,
 *     name: string,
 * }
 */
```
or just to make shorter schema name
```javascript
/**
 * @schema User = SomeVeryLongSchemaName
 */
```

## @call

You should provide valid js code of method call. This code will be used in your API tests.

```
@call object-method-call
```

```javascript
/**
 * @call object.method(param1, param2)
 */
```

## METHOD

HTTP request method. Default is [config.defaultMethod](#config)

```
GET|POST|PUT|DELETE|HEAD|OPTIONS
```


## CODE

HTTP response code. Default is [config.defaultCode](#config)

Formats:
 * `200` regular code number
 * `2xx` any code between 200 and 299
 * `200 - 400` any code between 200 and 400
 * `200 || 3xx || 400 - 500` or expression 
 
Example
```javascript
/**
 * @response 2xx || 301 User = {id: number}
 */
```

## path

URL `pathname`. For path parsing used [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) lib.

Parameters like `:id` can be used in `@call` as parameter of method call with same name.

```javascript
/**
 * @url GET /users/:id(\d+)
 * @call users.get(id)
 */
```

## OBJECT_NAME

Any valid js object name like `objectName` or with field of any deep `objectName.fieldName.field`

## json-schema

Object that describes how validate another object. For object validation used [ajv](https://www.npmjs.com/package/ajv) 
lib with few modifications for less code writing.

Default ajv schema
```javascript
schema = {
    type: "object",
    additionalProperties: false,
    required: ['id', /* "name", */ 'enabled', 'list', 'user', 'enumOfStrings'],
    properties: {
        id: {
            type: "number",
            // extra fields for number: maximum, minimum, exclusiveMaximum, exclusiveMinimum, multipleOf
        },
        name: {
            type: "string",
            // extra fields for string: maxLength, minLength, pattern, format
        },
        enabled: {
            type: "boolean",
            // no extra fields
        },
        list: {
            type: "array",
            // extra fields for array: maxItems, minItems, uniqueItems, items, additionalItems, contains
        },
        user: {
            type: "object",
            // extra fields for object: maxProperties, minProperties, required, properties, patternProperties, 
            //                          additionalProperties, dependencies, propertyNames
        },
        enumOfStrings: {
            type: "string",
            enum: ["user", "guest", "owner"]
        },
    }
}
```

Simplified description of schema
```javascript
schema = {
    id: number,
    [name]: string,
    enabled: boolean,
    listOfObjects: [{
        id: number,
        type: string,
    }],

    listOfNumbers: [{
        type: "number"
    }],

    // which means list is array of numbers

    user: {
        id: number,
        type: string,
    },
    enumOfStrings: "user" || "guest" || "owner",
}
```

So, if any object in a schema (including root) has field `type` with one of the string values 
`"number"`, `"integer"`, `"string"`, `"boolean"`, `"array"`, `"object"` or `"null"` than it means this object is validator.
In any other cases this object will be converted to `"object"` validator. Example
```javascript
schema = {
    days: [number],
    list: [{
        id: number,
        type: string,
    }],
    user: {
        id: number,
        type: string,
    },
    parent: {
        type: "object",
    },
}
```
Will be converted to
```javascript
schema = {
    type: "object",
    additionalProperties: false,
    required: ['days', 'list', 'user', 'parent'],
    properties: {
        days: {
            type: "array",
            items: {
                type: "number"
            }    
        },
        list: {
            type: "array",
            items: {
                type: "object",
                required: ["id", "type"],
                properties: {
                    id: {
                        type: "number"
                    },
                    type: {
                        type: "string"
                    },            
                }   
            }    
        },
        user: {
            type: "object",
            required: ["id", "type"],
            properties: {
                id: {
                    type: "number"
                },
                type: {
                    type: "string"
                },            
            }   
        },
        parent: {
            type: "object",
        },
    }
}
```

### Optional object fields

By default, all fields in an object are required. To make field optional just put it in brackets.
```javascript
schema = {
    id: number,
    [name]: string,
}
```
```javascript
schema = {
    type: "object",
    additionalProperties: false,
    required: ["id"],
    properties: {
        id: {type: "number"},
        name: {type: "string"},
    },
}
```

### Number patterns

Instead of short `number` validator you can use one of following number patterns as value of object field.

 * `int` number without floating-point
 * `positive` positive number including `0`
 * `negative` negative number excluding `0`
 * `id` number more than `0`

```javascript
schema = {
    id: id,
    price: positive,
    list: [int],
}
```
Will be converted to
```javascript
schema = {
    type: "object",
    additionalProperties: false,
    required: ['id', 'price', 'list'],
    properties: {
        id: {
            type: "number",
            minimum: 1,
        },
        price: {
            type: "number",
            minimum: 0,
        },
        list: {
            type: "array",
            items: {
                type: "integer",
            }
        },
    },
}
```

### String patterns

Instead of short `string` validator you can use one of following string patterns as value of object field.

 * `date` full-date according to RFC3339.
 * `time` time with optional time-zone.
 * `date-time` date-time from the same source (time-zone is optional, in ajv it's mandatory)
 * `date-time-tz` date-time with time-zone required
 * `uri` full URI.
 * `uri-reference` URI reference, including full and relative URIs.
 * `uri-template` URI template according to RFC6570
 * `email` email address.
 * `hostname` host name according to RFC1034.
 * `filename` name (words with dashes) with extension
 * `ipv4` IP address v4.
 * `ipv6` IP address v6.
 * `regex` tests whether a string is a valid regular expression by passing it to RegExp constructor.
 * `uuid` Universally Unique Identifier according to RFC4122.
 
```javascript
schema = {
    id: uuid,
    email: email,
    created_at: date-time,
    days: [date],
}
```
Will be converted to
```javascript
schema = {
    type: "object",
    additionalProperties: false,
    required: ['id', 'email', 'created_at', 'days'],
    properties: {
        id: {
            type: "string",
            format: "uuid",
        },
        email: {
            type: "string",
            format: "email",
        },
        created_at: {
            type: "string",
            format: "date-time",
        },
        days: {
            type: "array",
            items: {
                type: "string",
                format: "date",
            }
        },
    }
}
```

### Inject external schema

Using `OBJECT_NAME` you can inject external schema in current schema. 
```javascript
/**
 * @url GET /users/:id
 * @response User = {
 *     id: number,
 *     name: string,
 * }
 */
```

```javascript
/**
 * @url POST /users
 * @body {
 *     action: 'update' || 'delete',
 *     user: User,
 * }
 */
```

### anyOf schema

Instead of `anyOf` you can use `||` operator
```javascript
schema = {
    data: User || Account || {type: "object"}
}
```
will be
```javascript
schema = {
    type: "object",
    additionalProperties: false,
    required: ['data'],
    properties: {
        data: {
            anyOf: [
                {/* schema of User */},
                {/* schema of Account */},
                {type: "object"},
            ]
        }
    }
}
```

### allOf schema

Instead of `allOf` you can use `&&` operator
```javascript
schema = {
    data: User && Account && {type: "object"}
}
```
will be
```javascript
schema = {
    type: "object",
    additionalProperties: false,
    required: ['data'],
    properties: {
        data: {
            allOf: [
                {/* schema of User */},
                {/* schema of Account */},
                {type: "object"},
            ]
        }
    }
}
```
 

### Extend schema

To extend you can use object spread operator
```javascript
User = {
    id: number,
    data: string,
}

UserExtra = {
    name: string,
    created_at: date,
}

schema = {
   ...User,
   ...UserExtra,
   age: number, // add field
   data: undefined, // remove field
   created_at: date-time, // overwrite field
}
```
will be
```javascript
schema = {
   type: "object",
   additionalProperties: false,
   required: ['id', 'name', 'created_at', 'age'],
   properties: {
      id: {type: "number"},
      name: {type: "string"},
      created_at: {type: "string", format: "date-time"},
      age: {type: "number"},
   }
}
```

Also, you can overwrite validator options
```js
schema = {
   ...User,
   type: "object",
   additionalProperties: true,
}
```
Important to add `type: "object"` it says to compiler that this object is pure ajv validator, not simplified version.
```javascript
schema = {
   type: "object",
   additionalProperties: true,
   properties: {
      id: {type: "number"},
      data: {type: "string"},
   }
}
```
You extend even non object validators
```js
phone = {
	type: "string",
    pattern: "^\\d+$"
}

schema = {
	...phone,
    type: "string",
    maxLength: 20,
}
```

## object-method-call

Uniq sample of JavaScript code with some method call of some object, which will be generated for testing purposes.
In method call you can use named parameters from `@url`
```javascript
/**
 * @url GET /users
 * @call users.get()
 */

/**
 * @url GET /users/:id
 * @call users.get(id)
 */

/**
 * @url POST /users/:id/settings
 * @call users.setSettings(id)
 */

/**
 * @url POST /users/:id/settings
 * @call users.settings.update(id)
 */
```
There can be any number of nested objects and any method name. Only names of parameters should be equal.

## CLI

with [npx](https://www.npmjs.com/package/npx)

`npx adv -c path/to/config.json`

Parameters:

```
  -c, --config <path> path to config json file
  -a, --api-client <path> generate api client
  -b, --base-url <url> default Api.baseUrl
  -e, --express <path>  generate express middleware validator
  -n, --namespace <namespace>  generate validators only with this namespace or comma separated namespaces
  -M, --default-method <method>  default @url METHOD
  -C, --default-code <code>  default @response CODE
  --help                display help for command
```

## API client

Install in to your project packages [ajv](https://www.npmjs.com/package/ajv), [ajv-formats](https://www.npmjs.com/package/ajv-formats) (optional if you not using [String patterns](#string-patterns)), [request](https://www.npmjs.com/package/request) (if you don't like `request` then you will need to implement `Api.request`) and [path-to-regexp](https://www.npmjs.com/package/path-to-regexp). Client will depend on them.

Generate the API client with `npx adv -c path/to/config.json -a path/to/your/app/api-client.js`

Generated `api-client.js` will export class `Api`.
```js
const Api = require('./path/to/your/app/api-client.js');
const client = new Api();

console.log(Api.baseUrl); // value from config.baseUrl or --base-url cli option

// optionaly
Api.getAjv = () => createYourAjvInstance();
Api.request = ({method, url, params, query, body, endpoint, context}) => makeRequestReturnPromise(Api.baseUrl + url);
// --

client.someMethod(param)  // see @call annotation
  .then(responseBody => console.log(responseBody))
  .catch(err => {
     // @see Validation errors handling
  });
```

## Express middleware

Install in to your project packages [ajv](https://www.npmjs.com/package/ajv), [ajv-formats](https://www.npmjs.com/package/ajv-formats) (optional if you not using [String patterns](#string-patterns)) and [path-to-regexp](https://www.npmjs.com/package/path-to-regexp). Middleware depends on them.

Generate the middleware with `npx adv -c path/to/config.json -e path/to/your/app/validator.js`

Then add middleware to your express app
```js
const validator = require('./path/to/your/app/validator.js');

// optionaly
validator.getAjv = () => createYourAjvInstance();
// --

app.use(validator);
app.post('...', (req, res) => {});
app.use(function (err, req, res, next) {
    if (err instanceof validator.RequestValidationError) {
        // @see Validation errors handling
    }
    else if (err instanceof validator.ResponseValidationError) {
       // @see Validation errors handling
    }
    else {
    	next(err);
    }
    
    // or use base class
   
    if (err instanceof validator.ValidationError) {
       // @see Validation errors handling
    }
    else {
       next(err);
    }
});
```

## Universal middleware

Generate the middleware with `npx adv -c path/to/config.json -e path/to/your/app/validator.js`

Then add it to your app
```js
const validator = require('./validator.js');

function sendMessage(path, data) {
    try {
       var validateResponse = validator({
          url: path,
          body: data,
       });
    }
    catch (err) {
       // @see RequestValidationError
    }
    
    return ajax(path, data).then(function (result) {
    	if (validateResponse) {
           try {
              validateResponse(result);
           }
           catch (err) {
              // @see ResponseValidationError
           }
        }
    	
    	return result;
    });
}
```

## Validation errors handling

Both Api class and middleware exports three classes:

 * `ValidationError` - base class, extends `Error`
 * `RequestValidationError` - class of request validation error, extends `ValidationError` 
 * `ResponseValidationError` - class of response validation error, extends `ValidationError` 

```js
let err; // error from api client or middleware validator
let context; // Api class or middleware

if (err instanceof context.RequestValidationError) {
   console.log(err.message);
   console.log(err.property); // query | params | body
   console.log(err.errors); // @see https://github.com/ajv-validator/ajv/blob/master/docs/api.md#validation-errors
}
else if (err instanceof context.ResponseValidationError) {
   console.log(err.message); // "Invalid response body"
   console.log(err.errors); // @see https://github.com/ajv-validator/ajv/blob/master/docs/api.md#validation-errors
}

// or use base class

if (err instanceof context.ValidationError) {
   console.log(err.message);
   console.log(err.property);
   console.log(err.errors);
}
```

## Config

 * `include` array of paths to files relative to config path, [glob](https://www.npmjs.com/package/glob) pattern used
 * `exclude` array of paths to files to be excluded
 * `defaultMethod` overwrites default [METHOD](#method). Default is `GET`
 * `defaultCode` overwrites default [CODE](#code). Default is `200`
 * `express` same as `--express <path>`
 * `namespace` same as `--namespace <path>`

All paths are relative to config file location.

Example
```json
{
  "include": [
    "src/**/*.js"
  ],
  "exclude": [
    "src/tests"
  ],
  "defaultMethod": "POST",
  "defaultCode": "2xx || 301"
}
```
