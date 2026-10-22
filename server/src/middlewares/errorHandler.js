// Turns every error into a JSON response `{ message, code? }`. Details of unexpected
// errors are logged, never sent to the client.
const HttpError = require('../utils/httpError');

function notFound(req, res, next) {
  next(new HttpError(404, 'Resource not found'));
}

// Express recognizes error handlers by their 4 arguments, so `next` must stay
function errorHandler(err, req, res, next) {
  let status = 500;
  let body = { message: 'Internal server error' };

  if (err instanceof HttpError) {
    status = err.status;
    body = { message: err.message, ...(err.code && { code: err.code }) };
  } else if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    body = { message: err.message, code: err.code };
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    body = { message: 'Malformed JSON body' };
  } else if (err.status >= 400 && err.status < 500) {
    status = err.status;
    body = { message: err.message };
  }

  if (status >= 500) {
    req.log.error({ err }, 'Unhandled error');
  }
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
