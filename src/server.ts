// server.ts
import express, { Request, Response, NextFunction } from 'express'
import swaggerUi from 'swagger-ui-express'

import dotenv from 'dotenv'
dotenv.config()

import middleware from '@/middleware'
import routes from '@/routes'
import swaggerDocs from '@/swagger'
import logger from '@/middleware/logger'

const app = express()
const port = process.env.PORT || 5678

app.use(middleware)
app.use(routes)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

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
    logger.info(`Express server listening on port ${port}`)
})
