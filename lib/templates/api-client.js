module.exports = Api;

Api.baseUrl = '';

Api.endpoints = [];

/**
 * @name Api
 * @param {string} [baseUrl]
 * @constructor
 */
function Api(baseUrl = Api.baseUrl) {
	this.baseUrl = baseUrl;
}