# api ➡️ doc ➡️ validator

[![Build Status](https://travis-ci.com/redexp/apidoc.svg?branch=master)](https://travis-ci.com/redexp/apidoc)

## Annotations

 * [@url](#url)
 * [@baseUrl](#baseurl)
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
 * [object-method-call](#object-method-call)


## Usage

 * [cli](#cli)
 * [API client](#api-client)
 * [Express middleware](#express-middleware)
 * [Universal middleware](#universal-middleware)
 * [Swagger OpenAPI](#swagger-openapi)
 * [Validation errors handling](#validation-errors-handling)
 * [Config](#config)

## @url

```
@url [METHOD] path
```

```javascript
/**
 * Some description
 * @url POST /path/:param
 */
```

## @baseUrl

```
@baseurl path
```

```javascript
/**
 * @baseUrl /v1
 */

/**
 * @url /users
 */
```

Final url will be `/v1/users` 

## @params

Validate parameters of `@url` `path`

```
@params [OBJECT_NAME =] json-schema|OBJECT_NAME
```

```javascript
/**
 * @url GET /users/:id
 * @params {
 *   # some description for `id` (usefull for OpenApi)
 *   id: number,
 * }
 * @call users.get(id)
 */
```
or with `OBJECT_NAME` assign for future use
```javascript
/**
 * @url GET /users/:id
 * @params User = {
 *   id: number, // description for `id`
 * }
 */
```
or use an external schema as root schema
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
 *   ...User,
 *   name: string,
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
@body [# Description] [OBJECT_NAME =] json-schema|OBJECT_NAME
```

```javascript
/**
 * @body {
 *   id: number,
 *   name: string,
 * }

 * @body User = {
 *   id: number,
 *   name: string,
 * }

 * @body 
 * # Some body description
 * User = {
 *   id: number,
 *   name: string,
 * }
 */
```

## @response

Response http code and validation of response body.

```
@response [CODE] [# Description] [OBJECT_NAME =] json-schema|OBJECT_NAME
```
Response for `200` code
```javascript
/**
 * @response {
 *   id: number,
 *   name: string,
 * }
 */
```
Validators for different codes of same request
```javascript
/**
 * @response 200 {
 *   id: number,
 *   name: string,
 * }
 * @response 500 
 * # Some description
 * {
 *   message: string,
 * }
 */
```

## @namespace

Shortcut `@ns`

Word used to filter validators in target file.

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

Object that describes how validate another object. For validation used [ajv](https://www.npmjs.com/package/ajv).

For syntax details see [adv-parser](https://github.com/redexp/adv-parser)

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
-i, --include <path> path to source file
-a, --api-client <path> generate api client
-d, --api-dts <path> generate api client .d.ts file
-b, --base-url <url> default Api.baseUrl
-p, --base-path <path> base path for @see filename comment
-e, --express <path> generate express middleware validator
-o, --open-api <path> generate Swagger OpenAPI v3 json
-j, --json <path> save endpoints to json file
-s, --only-schemas [names...] save schemas instead of endpoints to json file
-n, --namespace <namespace> generate validators only with this namespace or comma separated namespaces
-M, --default-method <method> default @url METHOD
-C, --default-code <code> default @response CODE
-S, --default-schemas <path...> path to js file with default schemas
-J, --jsdoc-methods <boolean> generate methods @type, default true
-T, --jsdoc-typedefs <boolean> generate @typedef, default true
-R, --jsdoc-refs <boolean> use references to jsdoc @typedef or replace them with reference body, default true
-I, --include-jsdoc <boolean> include to endpoints standard jsdoc annotations, default false
-P, --extra-props <boolean> value for ajv "object" additionalProperties, default false
-N, --class-name <string> name of generated api client class, default "Api"
--path-to-regexp <boolean> whether to add a path-to-regexp support, default true
--request-method <boolean> whether to add a Api.request method, default true
--get-ajv-method <boolean> whether to add a Api.getAjv method, default true
--error-handler-method <boolean> whether to add a Api.errorHandler method, default true
```

## API client

Install in to your project packages [ajv](https://www.npmjs.com/package/ajv), [ajv-formats](https://www.npmjs.com/package/ajv-formats) (optional if you not using [String patterns](https://github.com/redexp/adv-parser#string-patterns)), [request](https://www.npmjs.com/package/request) (if you don't like `request` then you will need to implement `Api.request`) and [path-to-regexp](https://www.npmjs.com/package/path-to-regexp). Client will depend on them.

Generate the API client with `npx adv -c path/to/config.json -a path/to/your/app/api-client.js`

Example

```js
/**
 * @url POST /users
 * @body User = {id: number, name: string}
 * @response 200 User
 * @call addUser()
 */

/**
 * @url GET /users/:id
 * @params {id: number}
 * @response 200 User
 * @call users.get()
 */
```
Generated `api-client.js` will export class `Api`.
```js
const Api = require('./path/to/your/app/api-client.js');
const client = new Api(/* "https://new.base.url" optionaly, default is Api.baseUrl */);

console.log(Api.baseUrl); // value from config.baseUrl or --base-url cli option
console.log(Api.endpoints); // parsed endpoints from comments

// optionaly
Api.getAjv = () => createYourAjvInstance();
Api.request = function ({
   method, 
   url, 
   params /* url params like /:id */, 
   query, 
   body, 
   endpoint /* object from Api.endpoints */, 
   context /* Api class instance */
}) {
    return sendRequestReturnPromise(context.baseUrl + url);
}
Api.errorHandler = function (err) {
	console.error(err);
	
	throw err;
};
// --

await client.addUser({id: 1, name: 'Test'});

client.users.get({id: 1} /* or just 1 if @params has only one parameter */)
  .then(user => {
     console.log(user.name);
     console.log(client.requestCookieJar); // @see request.jar() https://github.com/request/request#examples
  })
  .catch(err => {
     // @see Validation errors handling
  });
```

## Express middleware

Install in to your project packages [ajv](https://www.npmjs.com/package/ajv), [ajv-formats](https://www.npmjs.com/package/ajv-formats) (optional if you not using [String patterns](https://github.com/redexp/adv-parser#string-patterns)) and [path-to-regexp](https://www.npmjs.com/package/path-to-regexp). Middleware depends on them.

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

## Swagger OpenAPI

Generate Swagger OpenAPI v3 json with `npx adv -c path/to/config.json -o path/to/open-api.json`

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
 * `defaultSchemas` same as `--default-schemas <path>`
 * `jsdocMethods` generate `@type` for each method. Default is `true`
 * `jsdocTypedefs` generate `@typedef` for each named schema. Default is `true`
 * `jsdocRefs` use references to `@typedef` or replace them with reference body. Default is `true`
 * `apiClient` same as `--api-client <path>`
 * `apiDts` same as `--api-dts <path>`
 * `basePath` same as `--base-path <path>`
 * `json` same as `--json <path>`
 * `onlySchemas` array of schemas names to be saved as json. Could be `true` or empty array then will be exported all schemas. 
    If no `json` parameter passed then formatted json will output to console
 * `express` same as `--express <path>`
 * `openApi` same as `--open-api <path>`
 * `namespace` same as `--namespace <namespace>`
 * `includeJsdoc` same as `--include-jsdoc <boolean>`
 * `extraProps` same as `--extra-props <boolean>`

All paths are relative to config file location.

Example
```json
{
  "include": [
    "src/**/*.js",
    "src/**/*.php"
  ],
  "exclude": [
    "src/tests"
  ],
  "defaultMethod": "POST",
  "defaultCode": "2xx || 301"
}
```
