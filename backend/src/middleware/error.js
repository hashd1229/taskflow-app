export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

export function sendSuccess(res, data, status = 200) {
  return res.status(status).json(data);
}
