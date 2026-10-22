// Error with an HTTP status, turned into a JSON response by the error handler.
// `code` is an optional machine-readable reason the client can react to.
class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

module.exports = HttpError;
