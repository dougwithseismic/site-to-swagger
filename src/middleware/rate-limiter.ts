import express from 'express'
import rateLimit from 'express-rate-limit'

// Apply rate limiting middleware
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 900, // Maximum number of requests allowed per windowMs
})

export default rateLimiter
