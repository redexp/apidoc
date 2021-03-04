const filesToEndpoints = require('./lib/filesToEndpoints');
const generateExpressMiddleware = require('./lib/generate/expressMiddleware');
const generateApiClient = require('./lib/generate/apiClient');

module.exports = {
	filesToEndpoints,
	generateExpressMiddleware,
	generateApiClient,
};