import { ZodError } from 'zod';
import ApiError from '../utils/ApiError.js';

/**
 * Returns middleware that validates req.body against the given Zod schema.
 * On validation failure, throws an ApiError(400) with joined issue messages.
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues.map((issue) => issue.message).join('; ');
        return next(new ApiError(400, message));
      }
      next(err);
    }
  };
};

export default validate;
