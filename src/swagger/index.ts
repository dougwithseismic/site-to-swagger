import swaggerJsdoc from 'swagger-jsdoc'
import fs from 'fs'
// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerDocument = JSON.parse(fs.readFileSync('./examples/swagger.json', 'utf-8'))

const swaggerDocs = swaggerJsdoc({
    swaggerDefinition: swaggerDocument,
    apis: ['./src/routes/*.ts']

})

export default swaggerDocs


