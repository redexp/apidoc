const rules = require('./rules');
const annotations = require('./annotations');

module.exports = function parseAnnotations(comment) {
	comment = comment
		.replace(/^\s*\*?/umg, '')
		.replace(/^\s+/mg, '')
		.trim();

	if (!rules.annotation.test(comment)) return [];

	var list = [];
	var last;

	comment.split("\n").forEach(function (line) {
		var match = rules.annotation.exec(line);

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
			item.value = annotation.prepare(item.value);
		}
	});

	return list;
};