import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validateRequest =
  <T>(
    schema: ZodType<T>,
  ): RequestHandler<any, any, any, any, { validatedData: T }> =>
  (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      return next(parsed.error);
    }
    res.locals.validatedData = parsed.data;
    next();
  };
