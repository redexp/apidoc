const fs = require('fs');
const parser = require('@babel/parser');
const t = require('@babel/types');

const TEXT = 1;
const COMMENT_WAIT_1 = 21;
const COMMENT_WAIT_2 = 22;
const COMMENT_TEXT = 3;
const COMMENT_NL = 4;
const ARRAY_START_WAIT = 51;
const ARRAY_END_WAIT = 52;

const propRule = /^[\r\n\t\s]*((?:class\s+|var\s+|let\s+|const\s+|async\s+|static\s+|function\s+)*)([$\w]+)(\s*[:=]\s*async\b)?/;
const varRule = /var|let|const/;
const prefixRule = /^(?:class|var|let|const|async|static|function)$/;

const CLEAN_MODE = 1;
const INNER_MODE = 2;
const OUTER_MODE = 3;

module.exports = function parseComments(filepath, params) {
	if (arguments.length === 1 && typeof filepath === 'object') {
		const handle = createHandle(filepath);
		handle(filepath.code);
		return handle.comments;
	}

	const handle = createHandle(params);
	const stream = fs.createReadStream(filepath);

	stream.on('data', function (chunk) {
		handle(chunk.toString());
	});

	return new Promise(function (done, fail) {
		stream.on('close', function () {
			done(handle.comments);
		});

		stream.on('error', fail);
	});
};

module.exports.createHandle = createHandle;

module.exports.CLEAN_MODE = CLEAN_MODE;
module.exports.INNER_MODE = INNER_MODE;
module.exports.OUTER_MODE = OUTER_MODE;

function createHandle({mode = CLEAN_MODE} = {}) {
	let state = TEXT;
	let comment = '';
	let loc = null;
	let line = 1;
	let column = 0;
	let index = 0;
	let array_text = '';
	let array_start_count = 0;

	const list = [];

	const updatePos = function (text) {
		index += text.length;

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
			switch (state) {
			case TEXT:
			case ARRAY_START_WAIT:
				const start = text.indexOf('/');

				if (state === ARRAY_START_WAIT) {
					const arr_start = text.indexOf('[');

					if (arr_start > -1 && (start === -1 || arr_start < start)) {
						text = slice(text, arr_start + 1);
						array_text = '[';
						state = ARRAY_END_WAIT;
						break;
					}
					else {
						state = TEXT;
					}
				}

				if (start === -1) {
					updatePos(text);
					return;
				}

				if (mode === OUTER_MODE) {
					comment = '/';
				}

				state = COMMENT_WAIT_1;
				text = slice(text, start + 1);

				break;

			case ARRAY_END_WAIT:
				const arr_start = text.indexOf('[');
				const arr_end = text.indexOf(']');

				if (
					arr_start > -1 &&
					(
						(arr_end > -1 && arr_start < arr_end) ||
						arr_end === -1
					)
				) {
					array_start_count++;
					array_text += text.slice(0, arr_start + 1);
					text = slice(text, arr_start + 1);
					break;
				}

				if (arr_end === -1) {
					updatePos(text);
					array_text += text;
					return;
				}

				if (array_start_count > 0) {
					array_start_count--;
					array_text += text.slice(0, arr_end + 1);
					text = slice(text, arr_end + 1);
					break;
				}

				list.at(-1).array = toArray(array_text + text.slice(0, arr_end + 1), {line, column});
				text = slice(text, arr_end + 1);
				state = TEXT;
				array_text = '';
				array_start_count = 0;
				break;

			case COMMENT_WAIT_1:
				if (text.charAt(0) !== '*') {
					state = TEXT;
					break;
				}

				if (mode === OUTER_MODE) {
					comment += '*';
				}

				state = COMMENT_WAIT_2;
				text = slice(text, 1);

				break;

			case COMMENT_WAIT_2:
				if (text.charAt(0) !== '*') {
					state = TEXT;
					break;
				}

				if (mode === OUTER_MODE) {
					comment += '*';
				}

				state = COMMENT_TEXT;
				text = slice(text, 1);
				loc = {
					line,
					column: column - 3,
					index: index - 3,
				};

				break;

			case COMMENT_TEXT:
				const nl = text.indexOf("\n");
				const end = text.indexOf("*/");

				if (nl === -1 && end === -1) {
					comment += text;
					updatePos(text);
					return;
				}

				if (nl > -1 && (end === -1 || end > nl)) {
					comment += text.slice(0, nl + (mode === CLEAN_MODE ? 1 : 0));
					text = slice(text, nl);
				}
				else {
					comment += text.slice(0, end);
					text = slice(text, end);
				}

				state = COMMENT_NL;
				break;

			case COMMENT_NL:
				const spaces = text.match(/^[\s\t\r\n]+/);

				if (spaces) {
					if (mode > CLEAN_MODE) {
						comment += spaces[0];
					}

					text = slice(text, spaces[0].length);
					break;
				}

				if (text.charAt(0) !== '*') {
					state = TEXT;
					comment = '';
					loc = null;
					break;
				}

				if (text.charAt(1) !== '/') {
					if (mode > CLEAN_MODE) {
						comment += '*';
					}

					state = COMMENT_TEXT;
					text = slice(text, 1);
					break;
				}

				if (mode === OUTER_MODE) {
					comment += '*/';
				}

				text = slice(text, 2);

				const item = {
					value: comment,
					start: loc,
					end: {
						line,
						column,
						index,
					}
				};

				state = TEXT;
				comment = '';
				loc = null;
				list.push(item);

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

				if (item.value.trim().startsWith('@array ')) {
					state = ARRAY_START_WAIT;
				}

				break;
			}
		}
	};

	handle.comments = list;

	return handle;
}

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