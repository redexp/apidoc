module.exports = function (value) {
	value = value.trim();

	if (!value) {
		throw new Error(`@namespace value required`);
	}

	return value;
};