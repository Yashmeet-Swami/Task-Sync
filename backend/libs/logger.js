import pino from "pino";
import env from "./env.js";

const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
});

export default logger;
