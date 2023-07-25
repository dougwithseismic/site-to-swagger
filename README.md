# parseHARtoSwagger

`parseHARtoSwagger` is a tool designed to transform HTTP Archive (HAR) files into OpenAPI (formerly known as Swagger) documentation. By analyzing HAR files, it systematically extracts endpoint data and responses to generate comprehensive OpenAPI documentation.

## 🛠 Installation

Ensure the following prerequisites are installed:

- Node.js
- NPM

To get started, install the required packages using:

```bash
npm install
```

## 🚀 Usage

```javascript
import { parseHARtoSwagger } from 'parseHARtoSwagger';

try {
    const swagger = await parseHARtoSwagger('./path_to_your_file.har');
    fs.writeFileSync('./swagger.json', JSON.stringify(swagger, null, 2));

    const yamlContent = await generateSwaggerYAML('./twitter.har')
    fs.writeFileSync('./swagger.yaml', yamlContent, 'utf8')

    
    logger.info('Swagger documentation successfully generated from HAR file');
} catch (error) {
    logger.error(`Error during Swagger documentation generation: ${error}`);
}
```

## 📖 How It Works

1. **Load HAR Content**:
    - Reads the HAR file and converts its content into a JSON format.
2. **Information Extraction**:
    - Iterates over each HTTP request/response entry in the HAR file.
    - Analyzes request specifics such as URL, method, query parameters, headers, and body.
    - Processes responses labeled with a `content-type` of `application/json`.
3. **OpenAPI/Swagger Generation**:
    - Transforms the gathered information into the OpenAPI format, detailing paths, methods, parameters, and responses.
    - Translates JSON bodies from both requests and responses into JSON Schema.
4. **Validation**:
    - Validates the formed OpenAPI structure against the official OpenAPI specification.
5. **Reporting**:
    - Constructs a summary report detailing insights into endpoints, utilized methods, and available response codes.
6. **Resulting Output**:
    - Outputs the constructed Swagger documentation in a consumable JSON format.

## ⚙️ Internal Functions

- `assignTagsToPaths(paths)`: Labels Swagger paths with tags derived from their URL segment. Utilizes the primary endpoint as its tag reference.
- `generateJsonSchema(jsonObj)`: Converts a JSON input into its corresponding JSON Schema.
- `generateArraySchema(jsonArr)`: Formulates a schema for array structures.
- `generateObjectSchema(jsonObj)`: Creates a schema for object data types.
- `hasParameter(params, name, location)`: Verifies the existence of a specific parameter within a Swagger path.
- `generateReport(paths)`: Develops a detailed report on identified endpoints.
- `validateSwagger(swagger)`: Ensures the produced Swagger document's compliance with the OpenAPI specification.

## 📌 Notes

- Responses are processed only if tagged with a `content-type` of `application/json`.
- If a parameter or header is identified in a request, the tool assumes its necessity for that specific request method.
- During the JSON Schema generation process, array-first items are utilized as references, and `null` values are treated as string types to ensure OpenAPI compatibility.

## 🤝 Contribution

We warmly welcome community contributions. Fork this project, submit issues, or contribute directly via pull requests. Your feedback and expertise are invaluable to us.

## 📜 License

Distributed under the MIT License.

---

This version includes enhanced formatting, clarified explanations, and the addition of emojis for a touch of modern style.
