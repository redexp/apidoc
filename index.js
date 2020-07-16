const parser = require('@babel/parser');
const fs = require('fs');
const parseAnnotations = require('./lib/parseAnnotations');
const parseEndpoint = require('./lib/parseEndpoint');

module.exports = async function convert(files) {
	if (files && !Array.isArray(files)) {
		files = [files];
	}

	var groups = new Set();

	await Promise.all(files.map(function (file) {
		return new Promise(function (done, fail) {
			fs.readFile(file, function (err, code) {
				if (err) {
					fail(err);
					return;
				}

				code = code.toString();

				var ast = parser.parse(code, {
					sourceType: "unambiguous",
					strictMode: false
				});

				ast.comments.forEach(function (comment) {
					var list = parseAnnotations(comment.value);

					if (!list.some(item => item.name === 'url' || item.name === 'schema')) {
						return;
					}

					groups.add(list);
				});

				done();
			});
		});
	}));

	var endpoints = new Set();

	groups.forEach(function (group) {
		endpoints.add(parseEndpoint(group));
		groups.delete(group);
	});


};