/**
 * @url POST /some/path/:id
 * @params Test
 * @query {r: number, [q]: string}
 * @body {type: 'object'}
 * @response 200 {data: Test}
 * @response 21x Test2 = {data: '21x'}
 * @response 300 - 400 {data: {id: id}}
 * @response 4xx || 500 || 501 - 600 {data: {test: negative}}
 * @call app.test1()
 */
app.post('/some/path');

var Controller = {
	/**
	 * @ns controller
	 * @url /controller/action
	 * @response {success: boolean} // some comment !@#$%^&*()
	 * @call controller.action()
	 * @returns string
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