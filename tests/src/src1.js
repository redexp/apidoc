/**
 * @url POST /some/path/:id
 * @params {id: number}
 * @body {type: 'object'}
 * @response 200 {data: Test}
 * @response 500 {[message]: string}
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