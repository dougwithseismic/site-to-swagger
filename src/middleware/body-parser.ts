import bodyParser from 'body-parser'

export const jsonMiddleware = bodyParser.json()
export const urlencodedMiddleware = bodyParser.urlencoded({ extended: true })

