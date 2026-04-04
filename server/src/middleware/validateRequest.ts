import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schemas: ValidationSchemas) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const validatedQuery = await schemas.query.parseAsync(req.query) as any;
        Object.keys(req.query as any).forEach(key => delete (req.query as any)[key]);
        Object.assign(req.query, validatedQuery);
      }
      if (schemas.params) {
        const validatedParams = await schemas.params.parseAsync(req.params) as any;
        Object.keys(req.params as any).forEach(key => delete (req.params as any)[key]);
        Object.assign(req.params, validatedParams);
      }
      next();
    } catch (error) {
      next(error); // Pass error to global error handler
    }
  };
};
