/**
 * @swagger
 * paths:
 *   /api/hello-world:
 *     get:
 *       description: Returns a simple message
 *       responses:
 *         200:
 *           description: A simple message
 *           content:
 *             text/plain:
 *               schema:
 *                 type: string
 */

import { Router } from 'express'

const router = Router()

router.get('/hello-world', (req, res) => {
    res.send('Hello, World!')
})

export default router
