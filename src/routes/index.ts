// routes/index.ts
import express from 'express'
import helloWorldRoutes from './hello-world'

const router = express.Router()

router.use('/api', [helloWorldRoutes])

export default router
