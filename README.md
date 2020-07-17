# api-doc-validator

## Annotations

 * [@url](#url)
 * [@params](#params)
 * [@query](#query)
 * [@body](#body)
 * [@response](#response)
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
 * [Config](#config)

## @url

```
@url METHOD path
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
 */
```
Example of valid request `GET /users?id=1`

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

## @schema

Define new schema for future usage

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
or even condition
```javascript
/**
 * @schema Product = {properties: {price: {minimum: 100}}} ? ExpensiveProduct : CheapProduct
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

HTTP request method.

```
GET|POST|PUT|DELETE|HEAD|OPTIONS
```


## CODE

HTTP response code like **200** or **500** etc. Default is **200**.


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
```

Simplified description of schema
```javascript
schema = {
    id: number,
    name: string,
    enabled: boolean,
    list: [{
        id: number,
        type: string,
    }],

    // or

    list: [{
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
 * `ipv4` IP address v4.
 * `ipv6` IP address v6.
 * `regex` tests whether a string is a valid regular expression by passing it to RegExp constructor.
 * `uuid` Universally Unique IDentifier according to RFC4122.
 * patterns from `stringPatterns` option in [config](#config)
 
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
    user: {
        ...User,
        ...UserExtra,
        data: undefined, // remove field
        created_at: date-time, // overwrite field
    },
}
```
will be
```javascript
schema = {
    type: "object",
    properties: {
        user: {
            type: "object",
            properties: {
                id: {type: "number"},
                name: {type: "string"},
                created_at: {type: "string", format: "date-time"},
            }
        },
    },
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

or add it to `package.json` to `"scripts":` section
```
"scripts": {
    "adv": "adv"
}
```
and run `npm run adv -c path/to/config.json`

## Config

 * `include` array of paths to files, [glob](https://www.npmjs.com/package/glob) pattern used
 * `exclude` array of paths to files to be excluded, [glob](https://www.npmjs.com/package/glob) pattern used
 * `stringPatterns` map of patterns names and regexp to validate strings

```json
{
  "include": [
    "src/**"
  ],
  "exclude": [
    "src/tests"
  ],
  "stringPatterns": {
    "week-day": "/^(sun|mon|tue|wed|thu|fri|sut)$/i"
  }
}
```
