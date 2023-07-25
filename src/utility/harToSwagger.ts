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

async function parseHARtoSwagger(filePath: string): Promise<any> {
    const harContent = JSON.parse(fs.readFileSync(filePath, 'utf8'))

    const { log } = harContent
    const { entries } = log

    const paths: any = {}

    for (const entry of entries) {
        const { request, response } = entry
        const url = new URL(request.url)
        const path = url.pathname

        if (response.content.mimeType !== 'application/json') {
            continue // Skip if not a JSON response.
        }

        if (!paths[path]) {
            paths[path] = {}
        }

        const method = request.method.toLowerCase()

        if (!paths[path][method]) {
            paths[path][method] = {
                parameters: [],
                responses: {},
            }
        }

        // Query parameters
        for (const q of request.queryString) {
            if (!hasParameter(paths[path][method].parameters, q.name, 'query')) {
                paths[path][method].parameters.push({
                    name: q.name,
                    in: 'query',
                    required: true,
                    schema: { type: 'string', default: q.value }, // Add default value here
                })
            }
        }

        // Headers
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
        }
    }

    assignTagsToPaths(paths)

    await validateSwagger(paths)

    const report = generateReport(paths)
    logger.info(`API Report: ${JSON.stringify(report, null, 2)}`)

    const swaggerDocs = {
        openapi: '3.0.0',
        info: {
            title: 'Generated from HAR',
            version: '1.0.0',
        },
        paths: paths,
    }

    return swaggerDocs
}

function assignTagsToPaths(paths: any): void {
    for (const path in paths) {
        const segments = path.split('/').filter(Boolean) // filtering out empty segments
        if (segments.length === 0) continue

        const tag = segments[0] // Use the base endpoint as the tag

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
