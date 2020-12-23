const filesToEndpoints = require('./lib/filesToEndpoints');
const generateTests = require('./lib/generate/tests');
const generateExpressMiddleware = require('./lib/generate/expressMiddleware');

module.exports = {
	filesToEndpoints,
	generateTests,
	generateExpressMiddleware,
};