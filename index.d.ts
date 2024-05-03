export function filesToEndpoints(files: Strings, options: Partial<CliConfig>): Promise<Endpoint[]>;
export function generateExpressMiddleware(endpoints: Endpoint[], file: string, options?: {schemas?: object} & Pick<CliConfig, 'jsdocTypedefs'>): void;
export function generateApiClient(endpoints: Endpoint[], file: string, options?: {schemas?: object} & Partial<CliConfig>): void;
export function parseAnnotations(comment: string, options?: Partial<CliConfig>): ParsedAnnotation[];

export type parseComments = {
	createHandle: () => ParseCommentsHandle,
	(file: string): Promise<ParsedComment[]>,
};

export type ParseCommentsHandle = {
	comments: ParsedComment[],
	(code: string): void,
};

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
	onlySchemas: Strings,
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

export type ParsedComment = {
	value: string,
	start: Loc,
	end: Loc,
	target?: ParsedCommentTarget,
	array?: ParsedCommentArray,
};

export type Loc = {
	line: number,
	column: number,
};

export type ParsedCommentTarget = {
	name: string,
	var?: 'var' | 'let' | 'const',
	class?: true,
	async?: true,
	static?: true,
	function?: true,
};

export type ParsedCommentArray = string[];

export type ParsedAnnotation = {
	name: AnnotationEnum,
	value: AnnotationNameToValue[AnnotationEnum],
	start: Loc,
	end: Loc,
};

export enum AnnotationEnum {
	NS = "ns",
	Schema = "schema",
	BaseUrl = "baseUrl",
	Url = "url",
	Params = "params",
	Query = "query",
	Body = "body",
	File = "file",
	Files = "files",
	Response = "response",
	Call = "call",
	Description = "description",
}

export type AnnotationNameToValue = {
	[AnnotationEnum.NS]: string,
	[AnnotationEnum.Schema]: AnnotationSchema & {
		name: string,
		local: boolean,
	},
	[AnnotationEnum.BaseUrl]: string,
	[AnnotationEnum.Url]: string,
	[AnnotationEnum.Params]: AnnotationSchema,
	[AnnotationEnum.Query]: AnnotationSchema,
	[AnnotationEnum.Body]: AnnotationSchema,
	[AnnotationEnum.File]: AnnotationSchema,
	[AnnotationEnum.Files]: AnnotationSchema,
	[AnnotationEnum.Response]: AnnotationSchema & {code: null | {type: 'string' | 'number'}},
	[AnnotationEnum.Call]: string,
	[AnnotationEnum.Description]: string,
};

type AnnotationSchema = {schema: string,};