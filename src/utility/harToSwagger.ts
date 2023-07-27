import SwaggerParser from '@apidevtools/swagger-parser'

import logger from '@/middleware/logger'
import fs from 'fs'

type JsonValue = string | number | boolean | null | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]

type JsonSchema = {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'
    items?: JsonSchema
    properties?: Record<string, JsonSchema>
}

/**
 * Convert path segments matching certain patterns (like UUIDs or digits) into query parameters.
 * For example, /user/12345-5678/get becomes /user/:userId/get.
 */

function convertToQueryParams(path: string, existingParams: any[]): string {
    const segments = path.split('/')
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]

        // This regex matches UUIDs or integers but avoids matching floating point numbers
        // Check for UUID pattern
        const uuidMatched = segment.match(
            /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/
        )

        // Check for integer pattern (excluding floating point numbers)
        const integerMatched = segment.match(/^\d+$/)

        // Check for any group of digits (including floating point numbers)
        const digitsMatched = segment.match(/^\d+(\.\d+)?$/)

        const matched =
            uuidMatched || digitsMatched || (integerMatched && !segment.includes('.'))
                ? segment
                : null
        if (matched) {
            const paramName = i > 0 ? segments[i - 1] + 'Id' : 'param' + i
            segments[i] = `{${paramName}}`

            const isUUID =
                /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/.test(
                    matched[0]
                )
            const paramType = isUUID ? 'string' : 'integer'

            if (!hasParameter(existingParams, paramName, 'path')) {
                existingParams.push({
                    name: paramName,
                    in: 'path',
                    required: true,
                    schema: { type: paramType, default: matched[0] },
                })
            }
        }
    }

    return segments.join('/')
}

function loadHarFile(filePath: string): any {
    try {
        const harContent = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        return harContent
    } catch (error) {
        logger.error(`Error parsing HAR file: ${error}`)
    }
}

type Paths = {
    [path: string]: {
        [method: string]: {
            parameters: any[]
            requestBody?: any
            responses: any
            summary?: string
        }
    }
}

async function parseHARtoSwagger(filePath: string): Promise<any> {
    const harContent = loadHarFile(filePath)

    const { log } = harContent
    const { entries } = log

    const paths: Paths = {}
    const servers: any = []

    for (const entry of entries) {
        const { request, response } = entry
        const url = new URL(request.url)
        let path = url.pathname

        if (!servers.find((s: any) => s.url === `${url.protocol}//${url.host}`)) {
            servers.push({ url: `${url.protocol}//${url.host}` })
        }

        if (response.content.mimeType !== 'application/json') {
            continue // Skip if not a JSON response.
        }

        if (!paths[path]) {
            paths[path] = {} // Create path if it doesn't exist
        }

        const method = request.method.toLowerCase()

        if (!paths[path][method]) {
            paths[path][method] = {
                parameters: [],
                responses: {},
                summary: url.href,
            }
        }

        const queryParamPath = convertToQueryParams(path, paths[path][method].parameters) // Convert path segments to query parameters like /api/user/1234 to /api/user/:userId

        if (queryParamPath !== path) {
            paths[queryParamPath] = paths[path]
            delete paths[path]
            path = queryParamPath
        }

        // Query parameters

        if (request.queryString) {
            for (const q of request.queryString) {
                if (!hasParameter(paths[path][method].parameters, q.name, 'query')) {
                    console.log('path, method :>> ', path, method, q)
                    paths[path][method].parameters.push({
                        name: q.name,
                        in: 'query',
                        required: true,
                        schema: { type: 'string', default: q.value }, // Add default value here
                    })
                }
            }
        }

        // Headers
        if (request.headers) {
            for (const h of request.headers) {
                if (
                    h.name.toLowerCase() !== 'host' &&
                    !hasParameter(paths[path][method].parameters, h.name, 'header')
                ) {
                    paths[path][method].parameters.push({
                        name: h.name,
                        in: 'header',
                        required: true,
                        schema: { type: 'string', default: h.value }, // Add default value here
                    })
                }
            }
        }

        // Request Body (if it's JSON)
        if (
            request.postData &&
            request.postData.mimeType === 'application/json' &&
            request.postData.text
        ) {
            try {
                const requestBody = JSON.parse(request.postData.text)
                paths[path][method].requestBody = {
                    content: {
                        'application/json': {
                            schema: generateJsonSchema(requestBody),
                            example: requestBody, // Add sample request body as an example
                        },
                    },
                }
            } catch (err) {
                console.error('Error parsing JSON request body from HAR:', err)
            }
        }

        // Response

        if (response.content.text) {
            try {
                const responseBody = JSON.parse(response.content.text)
                const responseSchema = generateJsonSchema(responseBody)
                paths[path][method].responses[response.status] = {
                    description: 'Generated from HAR',
                    content: {
                        'application/json': {
                            schema: responseSchema,
                        },
                    },
                }
            } catch (err) {
                console.error('Error parsing JSON response body from HAR:', err)
            }
        } else {
            paths[path][method].responses[response.status] = {
                description: 'Generated from HAR',
            }
        }
    }

    assignTagsToPaths(paths)

    // await validateSwagger(paths) // Remove for now.

    const report = generateReport(paths)
    logger.info(`API Report: ${JSON.stringify(report, null, 2)}`)

    const swaggerDocs = {
        openapi: '3.0.0',
        info: {
            title: 'Reverse Any Frontendw API with site-to-swagger - Example Docs',
            version: '1.0.0',
            description:
                'Automatically generate OpenAPI (Swagger) documentation from HTTP Archive (HAR) files. This tool extracts endpoint data and responses from HAR files to produce comprehensive OpenAPI documentation for reverse hackery. It supports parsing of requests, responses, JSON body translations, and more.',
            contact: {
                name: 'Dougie Silkstone',
                email: 'doug@withseismic.com',
                url: 'https://www.withseismic.com',
                'x-twitter': '@dougiesilkstone',
            },
            license: {
                name: 'Custom License',
                url: 'https://www.withseismic.com/license',
            },
        },
        externalDocs: {
            description: 'Github Example Link',
            url: 'https://github.com/dougwithseismic/site-to-swagger',
        },
        servers: servers,

        paths: paths,
    }

    return swaggerDocs
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

function assignTagsToPaths(paths: any): void {
    const mostCommonSegment = getMostCommonSegment(paths)

    for (const path in paths) {
        const segments = path.split('/').filter(Boolean)

        let tagIndex = segments.indexOf(mostCommonSegment) + 1
        let tag = segments[tagIndex] || 'Miscellaneous'

        for (const method in paths[path]) {
            if (!paths[path][method].tags) {
                paths[path][method].tags = []
            }
            paths[path][method].tags.push(tag)
        }
    }
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

function hasParameter(params: any[], name: string, location: string): boolean {
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

export default parseHARtoSwagger
