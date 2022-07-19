
/**
 * @param {{method: string, url: string, query?: Object, params?: Object, body?: any, endpoint: Object, context: Api, meta: any}} params
 * @returns {Promise<{statusCode: number, body?: any}>}
 */
Api.request = function ajax({method, url, query, body, context}) {
	const r = require('request');

	if (!context.requestCookieJar) {
		context.requestCookieJar = r.jar();
	}

	return new Promise(function (done, fail) {
		r({
			method,
			url: context.baseUrl + url,
			qs: query,
			json: true,
			jar: context.requestCookieJar,
			body,
		}, function (err, res) {
			if (err) {
				fail(err);
			}
			else {
				done(res);
			}
		});
	});
};
