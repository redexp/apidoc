const parseComments = require('./parseComments');
const parseAnnotations = require('./parseAnnotations');
const parseEndpoint = require('./parseEndpoint');
const {getAstSchema, generateAjvSchema} = require('adv-parser');
const defaultSchemas = require('adv-parser/schemas');

module.exports = function filesToEndpoints(files, options = {}) {
	if (files && !Array.isArray(files)) {
		files = [files];
	}

	const comments = [];
	const schemas = options.schemas || {...defaultSchemas};

	const mainAnnotations = ['url', 'baseUrl', 'schema'];

	return Promise
		.all(files.map(function (file) {
			return parseComments(file).then(function (list) {
				for (const comment of list) {
					const annotations = parseAnnotations(comment.value, options);

					if (annotations.every(item => !mainAnnotations.includes(item.name))) {
						continue;
					}

					for (const item of annotations) {
						if (item.value.schema) {
							item.value.schema = getAstSchema(item.value.schema, {schemas});
						}
						else if (Array.isArray(item.value)) {
							item.value.forEach(function (value) {
								if (value.schema) {
									value.schema = getAstSchema(value.schema, {schemas});
								}
							});
						}
					}

					comments.push({
						file,
						line: comment.start.line,
						annotations,
					});
				}
			});
		}))
		.then(function () {
			return comments.map(function (comment) {
				const list = comment.annotations;

				for (const item of list) {
					if (item.value.schema) {
						item.value.schema = generateAjvSchema(item.value.schema, {schemas});
					}
					else if (Array.isArray(item.value)) {
						item.value.forEach(function (value) {
							if (value.schema) {
								value.schema = generateAjvSchema(value.schema, {schemas});
							}
						});
					}
				}

				return parseEndpoint(list, {
					...options,
					file: comment.file,
					line: comment.line,
				});
			});
		});
};