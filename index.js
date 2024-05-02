const filesToEndpoints = require('./lib/filesToEndpoints');
const parseComments = require('./lib/parseComments');
const parseAnnotations = require('./lib/parseAnnotations');
const generateExpressMiddleware = require('./lib/generate/expressMiddleware');
const generateApiClient = require('./lib/generate/apiClient');

module.exports = {
	filesToEndpoints,
	parseComments,
	parseAnnotations,
	generateExpressMiddleware,
	generateApiClient,
};