const annotations = require('./annotations');
const annotationRule = /^(\s*)(@[\w\-]+)(.*)/m;

module.exports = function parseAnnotations(comment, options) {
	comment = comment
		.replace(/\r\n/g, ' \n')
		.replace(/^(\s*)\*/mg, (x, s) => s + ' ');

	if (!annotationRule.test(comment)) return [];

	const list = [];
	let last;
	let index = 0;

	comment.split("\n").forEach(function (line, i) {
		const match = annotationRule.exec(line);

		if (match) {
			last = {
				name: match[2].slice(1),
				value: match[3],
				start: {
					line: i,
					column: match[1].length,
					index: index + match.index + match[1].length,
				},
				end: {
					line: i,
					column: line.length,
					index: index + match[0].length
				},
			};

			list.push(last);
		}
		else if (last) {
			last.value += "\n" + line;
			last.end.line++;
			last.end.column = line.length;
			last.end.index += line.length + 1;
		}
		else if (line.trim()) {
			const offset = line.match(/^\s*/)[0].length;

			last = {
				name: 'description',
				value: line.trimStart(),
				start: {
					line: i,
					column: offset,
					index: index + offset,
				},
				end: {
					line: i,
					column: line.length,
					index: index + line.length + 1,
				},
			};

			list.push(last);
		}

		index += line.length + 1;
	});

	for (const item of list) {
		const annotation = annotations[item.name];

		if (annotation && annotation.prepare) {
			item.value = annotation.prepare(item.value, options);
		}
	}

	return list;
};