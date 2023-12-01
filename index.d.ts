export function filesToEndpoints(files: Strings, options: Partial<CliConfig>): Promise<Endpoint[]>;
export function generateExpressMiddleware(endpoints: Endpoint[], file: string, options?: {schemas?: object} & Pick<CliConfig, 'jsdocTypedefs'>): void;
export function generateApiClient(endpoints: Endpoint[], file: string, options?: {schemas?: object} & Partial<CliConfig>): void;

export type CliConfig = {
	config: string,
	include: Strings,
	exclude: Strings,
	defaultSchemas: Strings,
	apiClient: string,
	apiDts: string,
	baseUrl: string,
	basePath: string,
	express: string,
	openApi: string,
	json: string,
	exportSchemas: Strings,
	namespace: Strings,
	defaultMethod: "GET" | "POST",
	defaultCode: number,
	jsdocMethods: boolean,
	jsdocTypedefs: boolean,
	jsdocRefs: boolean,
	includeJsdoc: boolean,
	extraProps: boolean,
	className: string,
	pathToRegexp: boolean,
	requestMethod: boolean,
	getAjvMethod: boolean,
	errorHandlerMethod: boolean,
};

export type Strings = string | string[];

export type Endpoint = {
	namespace: string,
	file: string,
	line: number,
	baseUrl?: string,
	url?: {
		method: "HEAD" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE",
		path: string,
	},
	params?: {
		names: string[],
	},
	query?: {
		names: string[],
	},
	body?: {
		schema: Schema,
	},
	files?: {
		schema: Schema,
	},
	schema?: {
		name: string,
		schema: Schema,
	},
	response?: Array<{
		code: null | Schema,
		schema: Schema,
	}>,
	call?: {
		code: string,
		method: string,
		parts: string[],
		params: string[],
	},
	description?: string,
};

export type Schema = {[prop: string]: any};