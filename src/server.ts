// server.ts
import express, { Request, Response, NextFunction } from 'express'
import swaggerUi from 'swagger-ui-express'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

import middleware from '@/middleware'
import routes from '@/routes'
import swaggerDocs from '@/swagger'
import logger from '@/middleware/logger'
import parseHARtoSwagger from './utility/harToSwagger'

const app = express()
const port = process.env.PORT || 5678

app.use(middleware)
app.use(routes)

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack)
    res.status(500).send({ error: 'Something went wrong.' })
})

app.get('/', (req: Request, res: Response) => {
    res.send('Hello from Express with Winston logging and Swagger documentation!')
})

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).send('Internal Server Error')
})

app.listen(port, async () => {
    const EXAMPLE_PATH = './examples/example.har'

    try {
        const swagger = await parseHARtoSwagger(EXAMPLE_PATH) // Can also pass in an array of paths.

        for (const docType of swagger) {
            const { name, content } = docType
            fs.writeFileSync(`./examples/${name}`, JSON.stringify(content, null, 2))
        }

        logger.info('Swagger documentation generated from HAR file')
        logger.info(`Docs available at http://localhost:${port}/docs`)

        app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
    } catch (error) {
        logger.error(`Error generating Swagger documentation: ${error}`)
    }
})
