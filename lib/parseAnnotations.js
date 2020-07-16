const rules = require('./rules');

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

	return list;
};