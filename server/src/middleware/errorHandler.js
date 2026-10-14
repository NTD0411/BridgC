export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error('[errorHandler]', error.message || error);
  const httpStatus =
    error.statusCode ||
    error.status ||
    (error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE' ? 413 : null) ||
    (error.name === 'MulterError' ? 400 : null) ||
    (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : null) ||
    (error.code === 11000 ? 409 : 500);
  // clamp to valid HTTP range
  const status = (httpStatus >= 400 && httpStatus < 600) ? httpStatus : 500;
  return res.status(status).json({
    message: status === 500 ? 'Internal server error' : error.message,
  });
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
