# site-to-swagger - Reverse any frontend into Swagger Docs

## What is this?

If you're like me and enjoy poking around the network tab of your browser, you've probably noticed that most modern web applications communicate with their backend via HTTP requests. These requests are often made to RESTful endpoints, which are typically well-documented and easy to understand.

However, there are times when you may need to reverse engineer a frontend application to understand its API. This is where site-to-swagger comes in handy. It's a tool that can transform HTTP Archive (HAR) files into OpenAPI (formerly known as Swagger) documentation. By analyzing HAR files, it systematically extracts endpoint data and responses to generate comprehensive OpenAPI documentation.

## 🛠 Installation

Ensure the following prerequisites are installed:

- Node.js
- NPM

To get started, install the required packages using:

```bash
npm install
```

## 🚀 How To - Coming Soon

tldr: Open Browser with devtools.

1. Open the Network tab in the DevTools
2. Record your network activity by clicking the Record button or pressing Ctrl + E.
3. Perform the actions that you want to record.
4. Download the HAR file
5. Replace the HAR file in `./examples` folder. (Rename as example.har or edit `src/server.ts` to point to your file)
6. Run `npm start`
7. Open `http://localhost:5678/docs` in your browser or check `examples/example.json` and `examples/example.yaml` for the generated swagger files.
8. BONUS CONTENT - GENERATE CLIENTS AND SERVERS WITH `https://editor-next.swagger.io/`
Paste the contents of `examples/example.yaml` into the editor and generate clients and servers for your favorite language

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
4. **Reporting**:
    - Constructs a summary report detailing insights into endpoints, utilized methods, and available response codes.
5. **Resulting Output**:
    - Outputs the constructed Swagger documentation in a consumable JSON format. And YAML. And makes Swagger docs available at `http://localhost:5678/docs`.

    ![editor-next.swagger.io](/image.png)

## 💡 Features

1. **Supports Multiple HAR Files**:
    - The tool can process multiple HAR files at once, combining the results into a single OpenAPI document.
2. **Supports Multiple HTTP Methods**:
    - The tool supports all HTTP methods, including `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
3. **Supports Multiple Query Parameters**:
    - The tool supports multiple query parameters, including those with the same name.
4. **Tags by Path**:
    - The tool tags each endpoint by its path, grouping similar endpoints together. It intelligently ignores common path parameters like `/api/v1/*` to make more accurate tags.
5. **Automatically creates dynamic path parameters**:
    - The tool automatically creates path parameters for each unique path parameter found in the HAR file by detecting UUIDs, IDs, and other common path parameters. e.g. `/api/v1/users/{userId}`.
6. **Serves Swagger Documentation**:
    - The tool serves the generated Swagger documentation at `http://localhost:5678/docs` for easy consumption.

## 📌 Notes

- Responses are processed only if tagged with a `content-type` of `application/json`.
- If a parameter or header is identified in a request, the tool assumes its necessity for that specific request method.
- During the JSON Schema generation process, array-first items are utilized as references, and `null` values are treated as string types to ensure OpenAPI compatibility.
