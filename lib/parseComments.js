const fs = require('fs');
const parser = require('@babel/parser');
const t = require('@babel/types');

const TEXT = 1;
const COMMENT_WAIT_1 = 21;
const COMMENT_WAIT_2 = 22;
const COMMENT_TEXT = 3;
const COMMENT_NL = 4;
const ARRAY_WAIT = 5;

const propRule = /^[\r\n\t\s]*((?:class\s+|var\s+|let\s+|const\s+|async\s+|static\s+|function\s+)*)([$\w]+)(\s*[:=]\s*async\b)?/;
const varRule = /var|let|const/;
const prefixRule = /^(?:class|var|let|const|async|static|function)$/;

module.exports = function parseComments(file) {
	const stream = fs.createReadStream(file);

	let state = TEXT;
	let comment = '';
	let loc = null;
	let line = 1;
	let column = 0;

	const list = [];

	const updatePos = function (text) {
		const l = countLines(text);

		line += l;

		if (l > 0) {
			column = 0;
		}

		column += countColumns(text);
	};

	const slice = function (text, start) {
		updatePos(text.slice(0, start));

		return text.slice(start);
	};

	const handle = function (text) {
		while (text.length > 0) {
			if (state === TEXT) {
				const start = text.indexOf('/');

				if (start === -1) {
					updatePos(text);
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
				const nl = text.indexOf("\n");
				const end = text.indexOf("*/");

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
				const spaces = text.match(/^[\s\t\r\n]+/);

				if (spaces) {
					text = slice(text, spaces[0].length);
				}

				if (text.charAt(0) === '*') {
					if (text.charAt(1) === '/') {
						text = slice(text, 2);

						const item = {
							value: comment,
							start: loc,
							end: {
								line,
								column,
							}
						};

						state = TEXT;
						comment = '';
						loc = null;
						list.push(item);

						if (item.value.trim().startsWith('@array ')) {
							state = ARRAY_WAIT;
							continue;
						}

						const match = text.match(propRule);

						if (match && !prefixRule.test(match[2])) {
							const prefix = match[1] || '';
							const suffix = match[3] || '';

							const target = {
								name: match[2],
							};

							if (varRule.test(prefix)) {
								target.var = prefix.trim();
							}

							if (prefix.includes('class')) {
								target.class = true;
							}

							if (prefix.includes('async') || suffix.includes('async')) {
								target.async = true;
							}

							if (prefix.includes('static')) {
								target.static = true;
							}

							if (prefix.includes('function')) {
								target.function = true;
							}

							item.target = target;
						}
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

			if (state === ARRAY_WAIT) {
				const start = text.indexOf('[');

				if (start === -1) {
					updatePos(text);
					return;
				}

				text = slice(text, start);
				const end = text.indexOf(']');

				if (end === -1) {
					return;
				}

				const item = list.at(-1);
				item.array = toArray(text.slice(0, end + 1), {line, column});
				text = slice(text, end + 1);
				state = TEXT;
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
	const match = text.match(/\n/g);

	return match ? match.length : 0;
}

function countColumns(text) {
	const match = text.match(/\n?(.+)$/);

	return match ? match[1].length : 0;
}

function toArray(code, loc) {
	const ast = parser.parseExpression(code);

	if (!t.isArrayExpression(ast)) {
		const AdvSyntaxError = require('adv-parser/lib/AdvSyntaxError');

		throw new AdvSyntaxError({loc}, `Invalid array syntax`);
	}

	return (
		ast.elements
		.filter(node => t.isStringLiteral(node))
		.map(node => node.value)
	);
}