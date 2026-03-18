import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware to validate that specified route params are valid UUIDs.
 * Usage: router.get('/:id', validateUUIDParams('id'), handler)
 */
export const validateUUIDParams = (...paramNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (value && !UUID_REGEX.test(value)) {
        res.status(400).json({ error: `Invalid ${name} format` });
        return;
      }
    }
    next();
  };
};

/**
 * Express middleware factory for Zod validation.
 * Validates req.body, req.query, or req.params.
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data; // Replace with parsed/cleaned data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
};
