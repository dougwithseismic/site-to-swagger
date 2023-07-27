import SwaggerParser from '@apidevtools/swagger-parser'
import logger from '@/middleware/logger'
import fs from 'fs'
import yaml from 'js-yaml'

// Base JSON types
type JsonValue = string | number | boolean | null | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]

// JSON Schema
type JsonSchema = {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'
    items?: JsonSchema
    properties?: Record<string, JsonSchema>
}

type Paths = {
    [path: string]: {
        [method: string]: {
            parameters: any[]
            requestBody?: any
            responses: any
            summary?: string
            description?: string
            tags?: string[]
        }
    }
}
type Entry = {
    request: {
        url: string
        method: Method
        queryString?: Array<{ name: string; value: string }>
        headers?: Array<{ name: string; value: string }>
        postData?: {
            mimeType: string
            text: string
        }
    }
    response: {
        content: {
            mimeType: string
            text?: string
        }
        status: number
    }
}

type HARContent = {
    log: {
        entries: Entry[]
    }
}

type ParameterLocation = 'path' | 'query' | 'header'

enum Method {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch',
    OPTIONS = 'options',
    HEAD = 'head',
}

const UUID_REGEX = /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/

// Split the logic of detecting the segment type from the main function.

function loadHarFile(filePath: string): any {
    try {
        const harContent = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        return harContent
    } catch (error) {
        logger.error(`Error parsing HAR file: ${error}`)
        throw new Error(`Error parsing HAR file: ${error}`)
    }
}

async function parseHARtoSwagger(filePaths: string[] | string): Promise<any> {
    if (typeof filePaths === 'string') {
        filePaths = [filePaths]
    }

    const paths: Paths = {}
    const servers: Array<{ url: string }> = []

    for (const filePath of filePaths) {
        const harContent: HARContent = loadHarFile(filePath)
        const { entries } = harContent.log

        for (const entry of entries) {
            const { request, response } = entry
            const url = new URL(request.url)
            let path = url.pathname

            addServerIfNotExists(servers, `${url.protocol}//${url.host}`)

            if (response.content.mimeType !== 'application/json') continue // Skip if not a JSON response.

            addPathIfNotExists(paths, path)

            const method = request.method.toLowerCase() as Method

            const existingMethod = paths[path][method]
            if (!existingMethod) {
                paths[path][method] = {
                    parameters: [],
                    responses: {},
                    summary: url.href,
                    // description: url.href,
                }
            }

            const queryParamPath = convertToQueryParams(path, paths[path][method].parameters) // Convert path segments to query parameters like /api/user/1234 to /api/user/:userId

            path = swapOriginalPathForDynamic(queryParamPath, path, paths)

            handleQueryParams(paths, path, method, request.queryString)
            handleHeaders(paths, path, method, request.headers)
            handleRequestBody(paths, path, method, request.postData)
            handleResponseBody(paths, path, method, response)
        }
    }

    assignTagsToPaths(paths)

    const report = generateReport(paths)
    logger.info(`API Report: ${JSON.stringify(report, null, 2)}`)

    const swaggerJSON = createSwaggerDocs(paths, servers)
    const swaggerYAML = yaml.dump(swaggerJSON)

    return [
        {
            name: 'swagger.json',
            content: swaggerJSON,
        },
        {
            name: 'swagger.yaml',
            content: swaggerYAML,
        },
    ]
}

function addServerIfNotExists(servers: Array<{ url: string }>, url: string): void {
    if (!servers.some((s) => s.url === url)) {
        servers.push({ url })
    }
}

function addPathIfNotExists(paths: Paths, path: string): void {
    if (!paths[path]) {
        paths[path] = {}
    }
}

function swapOriginalPathForDynamic(queryParamPath: string, path: string, paths: Paths): string {
    if (queryParamPath !== path) {
        paths[queryParamPath] = paths[path]
        delete paths[path]
        return queryParamPath
    }
    return path
}

function handleQueryParams(
    paths: Paths,
    path: string,
    method: Method,
    queryParams?: Array<{ name: string; value: string }>
): void {
    if (!queryParams) return

    for (const { name, value } of queryParams) {
        paths[path][method].parameters.push({
            name: name,
            in: 'query' as ParameterLocation,
            required: true,
            example: value,
            schema: { type: 'string' },
        })
    }
}

function handleHeaders(
    paths: Paths,
    path: string,
    method: Method,
    headers?: Array<{ name: string; value: string }>
): void {
    if (!headers) return

    for (const { name, value } of headers) {
        if (['host', 'content-length'].includes(name.toLowerCase())) continue

        paths[path][method].parameters.push({
            name: name,
            in: 'header' as ParameterLocation,
            required: true,
            example: value,
            schema: { type: 'string' },
        })
    }
}

function handleRequestBody(
    paths: Paths,
    path: string,
    method: Method,
    postData?: { mimeType: string; text: string }
): void {
    if (!postData) return

    paths[path][method].requestBody = {
        content: {
            [postData.mimeType]: {
                schema: { type: 'object' }, // You might need a more complex method to infer the schema.
                example: postData.text,
            },
        },
    }
}

function createResponseDescription(response: {
    content: { mimeType: string; text?: string }
    status: number
}): string {
    const { content, status } = response
    const { mimeType, text } = content

    switch (status) {
        case 200:
            return `OK: ${text}`
        case 201:
            return `Created: ${text}`
        case 204:
            return `No Content: ${text}`
        case 400:
            return `Bad Request: ${text}`
        case 401:
            return `Unauthorized: ${text}`
        case 403:
            return `Forbidden: ${text}`
        case 404:
            return `Not Found: ${text}`
        case 500:
            return `Internal Server Error: ${text}`

        default:
            return `Status ${status}: ${text}`
    }
}

function handleResponseBody(
    paths: Paths,
    path: string,
    method: Method,
    response: { content: { mimeType: string; text?: string }; status: number }
): void {
    const responseContent = {
        description: createResponseDescription(response),
        content: {
            [response.content.mimeType]: {
                schema: { type: 'object' }, // Again, you might need a better way to infer the schema.
                example: response.content.text,
            },
        },
    }
    paths[path][method].responses[response.status] = responseContent
}

function convertToQueryParams(path: string, existingParams: any[]): string {
    const segments = path.split('/')
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        const { type, value } = detectSegmentType(segment)

        if (type !== 'none') {
            const paramName = i > 0 ? segments[i - 1] + 'Id' : 'param' + i
            segments[i] = `{${paramName}}`

            const paramType = type === 'uuid' ? 'string' : type

            if (!hasParameter(existingParams, paramName, 'path')) {
                existingParams.push({
                    name: paramName,
                    in: 'path',
                    required: true,
                    schema: { type: paramType, default: value },
                })
            }
        }
    }

    return segments.join('/')
}

function detectSegmentType(segment: string): {
    type: 'uuid' | 'integer' | 'float' | 'none'
    value: string
} {
    if (UUID_REGEX.test(segment)) {
        return { type: 'uuid', value: segment }
    } else if (/^\d+$/.test(segment)) {
        return { type: 'integer', value: segment }
    } else if (/^\d+(\.\d+)?$/.test(segment)) {
        return { type: 'float', value: segment }
    }
    return { type: 'none', value: segment }
}

function assignTagsToPaths(paths: Paths): void {
    const mostCommonSegment = getMostCommonSegment(paths)

    for (const path in paths) {
        for (const method in paths[path]) {
            const tags = extractTagsFromPath(path, paths, mostCommonSegment)
            paths[path][method].tags = tags
        }
    }
}

function extractTagsFromPath(path: string, paths: Paths, mostCommonSegment: string) {
    const DEFAULT_TAG_NAME = 'Misc'
    const segments = path.split('/').filter(Boolean)

    let tagIndex = segments.indexOf(mostCommonSegment) + 1
    let tag = segments[tagIndex] || DEFAULT_TAG_NAME

    return [tag]
}

function getMostCommonSegment(paths: any): string {
    const segmentCounts: Record<string, number> = {}

    for (const path in paths) {
        const segments = path.split('/').filter(Boolean)

        for (const segment of segments) {
            if (segmentCounts[segment]) {
                segmentCounts[segment]++
            } else {
                segmentCounts[segment] = 1
            }
        }
    }

    let mostCommonSegment = ''
    let maxCount = 0

    for (const segment in segmentCounts) {
        if (segmentCounts[segment] > maxCount) {
            mostCommonSegment = segment
            maxCount = segmentCounts[segment]
        }
    }

    return mostCommonSegment
}

/**
 * Generates a JSON schema for the given JSON value.
 * @param jsonObj The JSON value to generate a schema for.
 * @returns The generated JSON schema.
 */
function generateJsonSchema(jsonObj: JsonValue): JsonSchema {
    switch (typeof jsonObj) {
        case 'number':
            if (Number.isInteger(jsonObj)) {
                return { type: 'integer' }
            } else {
                return { type: 'number' }
            }

        case 'string':
            return { type: 'string' }

        case 'boolean':
            return { type: 'boolean' }

        case 'object':
            // Null check
            if (jsonObj === null) {
                // console.warn('Value is null. Treating as string for OpenAPI compatibility.')
                return { type: 'string' } // Consider null as string for OpenAPI compatibility
            }

            // Array check
            if (Array.isArray(jsonObj)) {
                return generateArraySchema(jsonObj)
            }

            // Regular objects
            return generateObjectSchema(jsonObj)

        default:
            console.error('Unrecognized value:', jsonObj)
            return { type: 'string' } // Default to string for unrecognized types.
    }
}

/**
 * Generates a JSON schema for an array.
 * @param jsonArr The array to generate a schema for.
 * @returns The generated JSON schema.
 */
function generateArraySchema(jsonArr: JsonArray): JsonSchema {
    if (!jsonArr.length) {
        return {
            type: 'array',
            items: { type: 'string' }, // Default to string type when no items to infer from.
        }
    }

    const itemSchemas = jsonArr.map(generateJsonSchema)

    // You can add logic here to merge or handle heterogeneous arrays.
    // For simplicity, we're just taking the first item's schema.
    return {
        type: 'array',
        items: itemSchemas[0],
    }
}

/**
 * Generates a JSON schema for an object.
 * @param jsonObj The object to generate a schema for.
 * @returns The generated JSON schema.
 */
function generateObjectSchema(jsonObj: JsonObject): JsonSchema {
    const properties: Record<string, JsonSchema> = {}
    for (const key in jsonObj) {
        if (jsonObj.hasOwnProperty(key)) {
            properties[key] = generateJsonSchema(jsonObj[key])
        }
    }

    return {
        type: 'object',
        properties,
    }
}

function hasParameter(
    params: { name: string; in: string }[],
    name: string,
    location: string
): boolean {
    return params.some((param) => param.name === name && param.in === location)
}

function generateReport(paths: any) {
    const totalEndpoints = Object.keys(paths).length
    const methods: Record<string, number> = {}
    const responseCodes: Record<string, number> = {}

    for (const path in paths) {
        for (const method in paths[path]) {
            methods[method] = (methods[method] || 0) + 1

            for (const code in paths[path][method].responses) {
                responseCodes[code] = (responseCodes[code] || 0) + 1
            }
        }
    }

    return {
        totalEndpoints,
        methods,
        responseCodes,
    }
}

async function validateSwagger(swagger: any) {
    try {
        const parser = new SwaggerParser()
        await parser.validate(swagger)
        console.log('Swagger is valid!')
    } catch (err) {
        console.error('Invalid Swagger:', err)
    }
}

function createSwaggerDocs(paths: Paths, servers: Array<{ url: string }>): object {
    return {
        openapi: '3.0.0',
        info: {
            title: 'Reverse Any Frontend API with site-to-swagger - Example Docs',
            version: '1.0.0',
            description:
                'Automatically generate OpenAPI (Swagger) documentation from HTTP Archive (HAR) files. Learn how at https://github.com/dougwithseismic/site-to-swagger.  This tool extracts endpoint data and responses from HAR files to produce comprehensive OpenAPI documentation for reverse hackery. It supports parsing of requests, responses, JSON body translations, and more.',
            contact: {
                name: 'Dougie Silkstone',
                email: 'doug@withseismic.com',
                url: 'https://www.withseismic.com',
                'x-twitter': '@dougiesilkstone',
            },
        },
        externalDocs: {
            description: 'Site-to-Swagger GitHub Repo',
            url: 'https://github.com/dougwithseismic/site-to-swagger',
        },
        servers: servers,

        paths: paths,
    }
}

export default parseHARtoSwagger
