	if (typeof pathToRegexp === 'function') {
		e.url.params = [];

		e.url.regexp = pathToRegexp(
			e.url.path,
			e.url.params
		);
	}

	if (typeof createToPath === 'function') {
		e.url.toPath = createToPath(
			e.url.path
		);
	}

