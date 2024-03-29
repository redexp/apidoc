module.exports = {
	namespace: require('./namespace'),
	schema:    require('./schema'),
	baseUrl:   require('./baseUrl'),
	url:       require('./url'),
	params:    require('./params'),
	query:     require('./query'),
	body:      require('./body'),
	file:      require('./file'),
	files:     require('./files'),
	response:  require('./response'),
	call:      require('./call'),
	description: require('./description'),

	__shortcuts: {
		ns: 'namespace'
	}
};