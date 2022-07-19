
class ValidationError extends Error {
	constructor(message, endpoint, validator, data, errors) {
		super(message);

		this.name = "ValidationError";
		this.endpoint = endpoint;
		this.validator = validator;
		this.data = data;
		this.errors = errors;
	}
}

class RequestValidationError extends ValidationError {
	constructor(message, endpoint, type, data, errors) {
		super(message, endpoint, endpoint[type], data, errors);

		this.name = "RequestValidationError";
		this.type = type;
	}
}

class ResponseValidationError extends ValidationError {
	constructor(message, endpoint, validator, data, errors) {
		super(message, endpoint, validator, data, errors);

		this.name = "ResponseValidationError";
	}
}

Api.ValidationError = ValidationError;
Api.RequestValidationError = RequestValidationError;
Api.ResponseValidationError = ResponseValidationError;
