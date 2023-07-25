Express Server
==============

This Express server is a simple server written in TypeScript that makes use of several popular packages to handle HTTP requests. The server is based on the popular [Express](https://expressjs.com/) framework.

Features
--------

1. **Middleware**: The server makes use of middleware to handle incoming requests. Middleware functions are functions that have access to the request object, the response object, and the next middleware function in the application’s request-response cycle. These functions are used to perform tasks such as authentication, logging, and parsing incoming data.

2. **Routing**: The server uses routing to handle different HTTP requests. Routing refers to the definition of endpoints and how they should respond to various HTTP requests. In this server, routing is defined in the `./routes` module.

3. **Error Handling**: The server has two error handling middleware functions that catch any errors that occur in the application. The first one logs the error to the console and sends a generic error message to the client, while the second one sends a 500 Internal Server Error response to the client.

4. **Swagger Documentation**: This server integrates [Swagger UI](https://swagger.io/tools/swagger-ui/) for API documentation. Swagger UI is a popular open-source tool for generating and visualizing API documentation. In this server, Swagger UI is used to display the API documentation defined in the `./swagger` module. The documentation is accessible at the `/api-docs` endpoint.

5. **Default Endpoint**: The server has a default endpoint at the root (`/`) that returns a simple message.

6. **Listening Port**: The server listens on port 3000. When the server starts, it logs a message to the console indicating that it is listening on the specified port.

Summary
-------

This Express server is a simple server that makes use of popular packages to handle HTTP requests, including middleware, routing, error handling, API documentation, a default endpoint, and a listening port. It is a great starting point for building more complex applications.

* * *

Getting Started
---------------

To run the server, simply clone the repository, install the dependencies, and run the `npm start` command.

```
git clone https://github.com/your-repo
cd your-repo
npm install
npm start
```

The server will start and log a message indicating that it is listening on port 3000. You can access the API documentation at `http://localhost:3000/api-docs`.

Dependencies
------------

This server makes use of the following dependencies:

* [Express](https://expressjs.com/): A fast, minimal, and flexible Node.js web framework.
* [Swagger UI](https://swagger.io/tools/swagger-ui/): An open-source tool for generating and visualizing API documentation.

Contributing
------------

This project is open to contributions from the community. If you would like to contribute, simply fork the repository, make your changes, and submit a pull request.
