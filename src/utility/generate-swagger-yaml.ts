import fs from 'fs'
import yaml from 'js-yaml'
import parseHARtoSwagger from './harToSwagger'

async function generateSwaggerYAML(filePath: string): Promise<string> {
    const swaggerJSON = await parseHARtoSwagger(filePath)
    return yaml.dump(swaggerJSON)
}

function saveSwaggerYAML(filePath: string, yamlContent: string): void {
    fs.writeFileSync(filePath, yamlContent, 'utf8')
}

export { generateSwaggerYAML, saveSwaggerYAML }
