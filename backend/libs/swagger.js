import swaggerJSDoc from "swagger-jsdoc";

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TaskSync API",
      version: "1.0.0",
      description:
        "REST API for TaskSync - workspaces, projects, tasks, comments, and team collaboration.",
    },
    servers: [{ url: "/api-v1" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./routes/*.js"],
});

export default swaggerSpec;
