module.exports = function getSchemaDescription(text) {
	var desc = undefined;

	if (text.indexOf('#') === -1) return [text, desc];

	text = text.replace(/^\s*#(.+)$/gm, function (x, text) {
		if (!desc) {
			desc = '';
		}

		desc += text + '\n';

		return '';
	});

	return [text, desc && desc.trim()];
};