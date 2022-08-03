module.exports = Api;

Api.baseUrl = '';

/**
 * @name Api
 * @param {string} [baseUrl]
 * @constructor
 */
function Api(baseUrl = Api.baseUrl) {
	this.baseUrl = baseUrl;
}