const fs = require('fs');

const TEXT = 1;
const COMMENT_WAIT_1 = 21;
const COMMENT_WAIT_2 = 22;
const COMMENT_TEXT = 3;
const COMMENT_NL = 4;

module.exports = function parseComments(file) {
	var stream = fs.createReadStream(file);

	var state = TEXT;
	var comment = '';
	var loc = null;
	var line = 1;
	var column = 0;
	var list = [];

	var updatePos = function (text) {
		var l = countLines(text);

		line += l;

		if (l > 0) {
			column = 0;
		}

		column += countColumns(text);
	};

	var slice = function (text, start) {
		var offset = text.slice(0, start);

		updatePos(offset);

		return text.slice(start);
	};

	var handle = function (text) {
		while (text.length > 0) {
			if (state === TEXT) {
				let start = text.indexOf('/');

				if (start === -1) {
					slice(text);
					return;
				}

				state = COMMENT_WAIT_1;
				text = slice(text, start + 1);
			}

			if (state === COMMENT_WAIT_1) {
				if (text.charAt(0) === '*') {
					state = COMMENT_WAIT_2;
					text = slice(text, 1);
				}
				else {
					state = TEXT;
					continue;
				}
			}

			if (state === COMMENT_WAIT_2) {
				if (text.charAt(0) === '*') {
					state = COMMENT_TEXT;
					text = slice(text, 1);
					loc = {
						line,
						column: column - 3,
					};
				}
				else {
					state = TEXT;
					continue;
				}
			}

			if (state === COMMENT_TEXT) {
				let nl = text.indexOf("\n");
				let end = text.indexOf("*/");

				if (nl === -1 && end === -1) {
					comment += text;
					updatePos(text);
					return;
				}

				if (nl > -1 && (end === -1 || end > nl)) {
					comment += text.slice(0, nl + 1);
					text = slice(text, nl);
					state = COMMENT_NL;
				}
				else if (end > -1 && (nl === 1 || nl > end)) {
					comment += text.slice(0, end);
					text = slice(text, end);
					state = COMMENT_NL;
				}
			}

			if (state === COMMENT_NL) {
				let spaces = text.match(/^[\s\t\r\n]+/);

				if (spaces) {
					text = slice(text, spaces[0].length);
				}

				if (text.charAt(0) === '*') {
					if (text.charAt(1) === '/') {
						state = TEXT;
						text = slice(text, 2);
						list.push({
							value: comment,
							start: loc,
							end: {
								line,
								column,
							}
						});
						comment = '';
						loc = null;
					}
					else {
						state = COMMENT_TEXT;
						text = slice(text, 1);
					}
				}
				else {
					state = TEXT;
					comment = '';
					loc = null;
				}
			}
		}
	};

	stream.on('data', function (chunk) {
		handle(chunk.toString());
	});

	return new Promise(function (done, fail) {
		stream.on('close', function () {
			done(list);
		});

		stream.on('error', fail);
	});
};

function countLines(text) {
	var match = text.match(/\n/g);

	return match ? match.length : 0;
}

function countColumns(text) {
	var match = text.match(/\n?(.+)$/);

	return match ? match[1].length : 0;
}