const prop = require('./prop');
const props = require('./props');
const pick = (schema, args) => props(schema, args, {methodName: 'pick'});
const remove = require('./remove');
const omit = (schema, args) => remove(schema, args, {methodName: 'omit'});
const merge = require('./merge');
const add = (target, schemas) => merge(target, schemas, {methodName: 'add'});
const assign = (target, schemas) => merge(target, schemas, {methodName: 'assign'});
const extend = (target, schemas) => merge(target, schemas, {methodName: 'extend'});
const required = require('./required');
const notRequired = (schema, args) => required(schema, args, {methodName: 'notRequired', add: false});
const optional = (schema, args) => required(schema, args, {methodName: 'optional', add: false});
const get = require('./get');
const set = require('./set');

module.exports = {
	prop,
	props,
	pick,
	remove,
	omit,
	merge,
	add,
	assign,
	extend,
	required,
	notRequired,
	optional,
	get,
	set,
};