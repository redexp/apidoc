const annotations = require('./annotations');
const annotationRule = /^(\s*)(@[\w\-]+)(.*)/m;

module.exports = function parseAnnotations(comment, options) {
	comment = comment
		.replace(/\r\n/g, ' \n')
		.replace(/^(\s*)\*/mg, (x, s) => s + ' ');

	if (!annotationRule.test(comment)) return [];

	var list = [];
	var last;

	comment.split("\n").forEach(function (line, index) {
		const match = annotationRule.exec(line);

		if (match) {
			last = {
				name: match[2].slice(1),
				value: match[3],
				start: {
					line: index,
					column: match[1].length,
				},
				end: {
					line: index,
					column: line.length,
				},
			};

			list.push(last);
		}
		else if (last) {
			last.value += "\n" + line;
			last.end.line++;
			last.end.column = line.length;
		}
		else if (line.trim()) {
			last = {
				name: 'description',
				value: line.trimStart(),
				start: {
					line: index,
					column: line.match(/^\s*/)[0].length,
				},
				end: {
					line: index,
					column: line.length,
				},
			};

			list.push(last);
		}
	});

	for (const item of list) {
		const annotation = annotations[item.name];

		if (annotation && annotation.prepare) {
			item.value = annotation.prepare(item.value, options);
		}
	}

	return list;
};