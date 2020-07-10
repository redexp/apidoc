const babel = require('@babel/core');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const template = require('@babel/template').default;
const t = require('@babel/types');
const fs = require('fs');

const annotationRule = /^@[\w\-]+/m;

module.exports = function convert(files) {
	if (files && !Array.isArray(files)) {
		files = [files];
	}

	files.forEach(function (file) {
		fs.readFile(file, function (err, code) {
			code = code.toString();

			var ast = parser.parse(code, {
				sourceType: "unambiguous",
				strictMode: false
			});

			ast.comments.forEach(function (comment) {
				var text = comment.value.replace(/^\s*\*?/umg, '').replace(/^\s+/mg, '').trim();

				if (!annotationRule.test(text)) return;


			});
		});
	});
};