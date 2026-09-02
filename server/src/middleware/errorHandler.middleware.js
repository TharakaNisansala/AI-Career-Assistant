// Catches any request that didn't match a route (after all routers have run).
function notFoundHandler(req, res) {
  res.status(404).json({ status: "error", message: "Route not found" });
}

// Last-resort safety net: every controller already catches its own errors
// via handleControllerError, but this catches what they can't -- malformed
// JSON bodies rejected by express.json(), errors thrown outside a try/catch,
// and anything a future route forgets to handle -- so the client always gets
// a consistent JSON error response instead of Express's default HTML page or
// a hung connection.
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  if (res.headersSent) {
    return;
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ status: "error", message: "Malformed JSON in request body" });
  }

  console.error("Unhandled error:", err);
  res.status(err.status || err.statusCode || 500).json({
    status: "error",
    message: "An unexpected error occurred",
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
