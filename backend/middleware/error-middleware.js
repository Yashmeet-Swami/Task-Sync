const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // 5xx are unexpected failures worth alerting on; 4xx are routine client errors
  // (bad input, expired tokens, etc.) that don't need error-level noise.
  const log = req.log ?? console;
  if (statusCode >= 500) {
    log.error({ err }, err.message);
  } else {
    log.warn({ err: err.message }, err.message);
  }

  res.status(statusCode).json({
    success: false,
    status: err.status || "error",
    message: err.message || "Internal server error",
  });
};

export default errorMiddleware;
