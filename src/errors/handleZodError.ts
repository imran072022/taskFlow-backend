import { ZodError } from "zod";

import type { TErrorResponse } from "./error.type";

export const handleZodError = (error: ZodError): TErrorResponse => {
  const errors = error.issues.map((issue) => ({
    field: issue.path.slice(1).join("."),
    message: issue.message,
  }));

  return {
    statusCode: 400,
    message: errors[0]?.message ?? "Validation failed.",
    errors,
  };
};
