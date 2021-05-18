/**
 * Some description
 * second lines
 * @url POST /some/path/:id
 * @params Test
 * @query {
 *   # desc for r param
 *   r: number,
 *   [q]: string, // desc for q param
 * }
 * @body
 * # Body desc
 * {
 *   type: 'object'
 * }
 * @response 200
 * // Resp 200 desc
 * {
 *   data: Test
 * }
 * @response 21x
 * # Resp 21x desc
 * Test2 = {
 *   data: '21x'
 * }
 * @response 300 - 400 {data: {id: id}}
 * @response 4xx || 500 || 501 - 599 {data: {test: negative}}
 * @call app.test1()
 */
app.post('/some/path');

var Controller = {
	/**
	 * @ns controller
	 * @url /controller/action
	 * @response {success: boolean} // some comment !@#$%^&*()
	 * @call controller.action()
	 * @returns {string}
	 */
	action: function () {
		return '';
	}
};

/**
 * @url /users
 * @response 2xx [{id: id, name: string}]
 * @call getUsers()
 */