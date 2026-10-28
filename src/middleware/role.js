import ApiError from '../utils/ApiError.js';

/**
 * Restrict access to specific roles.
 * Usage: authorize('admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden – you do not have permission to perform this action'));
    }
    next();
  };
};

export default authorize;
