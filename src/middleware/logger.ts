import { createLogger, format, transports } from 'winston'
import express from 'express'

const { combine, timestamp, printf } = format

interface LogFormat {
    level: string
    message: string
    timestamp?: string
}

// Define log format
const logFormat = printf(({ level, message, timestamp }: LogFormat) => {
    return `[${timestamp}] ${level}: ${message}`
})

// Create a logger instance
const logger = createLogger({
    level: 'info', // Set the logging level (e.g., 'info', 'debug', 'error')
    format: combine(
        timestamp(), // Add timestamp to logs
        format.colorize(), // Add colors to logs
        logFormat
    ),
    transports: [
        new transports.Console(), // Output logs to console
        new transports.File({ filename: 'logs/error.log', level: 'error' }), // Save error logs to a file
    ],
})

// Middleware to log incoming requests
export function requestLogger(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    logger.info(`${req.method} ${req.url}`)
    next()
}

// Middleware to handle uncaught exceptions
export function exceptionLogger(
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    logger.error(err.stack)
    res.status(500).send('Something broke!')
}

export default logger
