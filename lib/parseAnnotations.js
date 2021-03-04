const annotations = require('./annotations');
const annotationRule = /^\s*@([\w\-]+)(.*)/m;

module.exports = function parseAnnotations(comment, options) {
	comment = comment
		.replace(/^\s+/mg, '')
		.trim();

	if (!annotationRule.test(comment)) return [];

	var list = [];
	var last;

	comment.split("\n").forEach(function (line) {
		var match = annotationRule.exec(line);

		if (match) {
			last = {
				name: match[1],
				value: match[2],
			};

			list.push(last);
		}
		else if (last) {
			last.value += "\n" + line;
		}
	});

	list.forEach(function (item) {
		var annotation = annotations[item.name];

		if (annotation && annotation.prepare) {
			item.value = annotation.prepare(item.value, options);
		}
	});

	return list;
};