const {weather} = require('./tests/output/tests');

weather.get('London,uk', '439d4b804bc8187953eb36d2a8c26a02').then(function (res) {
	console.log('Valid', res);
}, function (errors) {
	console.error(JSON.stringify(errors, null, '  '));
}).then(function () {
	process.exit();
});