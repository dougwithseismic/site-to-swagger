// middleware/index.ts
import cors from 'cors'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import logger, { requestLogger, exceptionLogger } from './logger'
import rateLimiter from './rate-limiter'

export default [cors(), bodyParser.json(), bodyParser.urlencoded({ extended: true }), helmet(), requestLogger, exceptionLogger, rateLimiter]
