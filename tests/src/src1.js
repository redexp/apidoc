/**
 * @url POST /some/path/:id
 * @params {id: number}
 * @body {type: 'object'}
 * @response 200 {data: Test}
 * @response 21x {data: '21x'}
 * @response 300 - 400 {data: {id: id}}
 * @response 4xx || 500 || 501 - 600 {data: {test: negative}}
 * @call app.test1(id)
 */
app.post('/some/path');

var Controller = {
	/**
	 * @url POST /controller/action
	 * @call controller.action()
	 */
	action: function () {

	}
};