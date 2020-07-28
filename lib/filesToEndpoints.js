const parser = require('@babel/parser');
const fs = require('fs');
const parseAnnotations = require('./parseAnnotations');
const parseEndpoint = require('./parseEndpoint');
const {getAstSchema, generateAjvSchema} = require('./parseSchema');
const {getDefaultSchemas} = require('./schemas');

module.exports = function filesToEndpoints(files) {
	if (files && !Array.isArray(files)) {
		files = [files];
	}

	var groups = [];
	var cache = getDefaultSchemas();

	return Promise
		.all(files.map(function (file) {
			return new Promise(function (done, fail) {
				fs.readFile(file, function (err, code) {
					if (err) {
						fail(err);
						return;
					}

					var ast = parser.parse(code.toString(), {
						sourceType: "unambiguous",
						strictMode: false
					});

					ast.comments.forEach(function (comment) {
						var list = parseAnnotations(comment.value);

						if (!list.some(item => item.name === 'url' || item.name === 'schema')) {
							return;
						}

						list.forEach(function (item) {
							if (item.value.schema) {
								item.value.schema = getAstSchema(item.value.schema, cache);
							}
							else if (Array.isArray(item.value)) {
								item.value.forEach(function (value) {
									if (value.schema) {
										value.schema = getAstSchema(value.schema, cache);
									}
								});
							}
						});

						groups.push(list);
					});

					done();
				});
			});
		}))
		.then(function () {
			return groups.map(function (list) {
				list.forEach(function (item) {
					if (item.value.schema) {
						item.value.schema = generateAjvSchema(item.value.schema, cache);
					}
					else if (Array.isArray(item.value)) {
						item.value.forEach(function (value) {
							if (value.schema) {
								value.schema = generateAjvSchema(value.schema, cache);
							}
						});
					}
				});

				return parseEndpoint(list);
			});
		});
};