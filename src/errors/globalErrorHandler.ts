import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/AppError.js";
import { isPrismaError } from "./isPrismaError.js";
import { handlePrismaError } from "./handlePrismaError.js";
import type { TErrorResponse } from "./error.type.js";
import { ZodError } from "zod";
import { handleZodError } from "./handleZodError.js";

export const globalErrorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  console.error(error);

  let formattedError: TErrorResponse;

  if (isPrismaError(error)) {
    formattedError = handlePrismaError(error);
  } else if (error instanceof ZodError) {
    formattedError = handleZodError(error);
  } else if (error instanceof AppError) {
    formattedError = {
      statusCode: error.statusCode,
      message: error.message,
    };
  } else if (error instanceof Error) {
    formattedError = {
      statusCode: 500,
      message: "Something went wrong.",
    };
  } else {
    formattedError = {
      statusCode: 500,
      message: "Something went wrong.",
    };
  }

  res.status(formattedError.statusCode).json({
    success: false,
    statusCode: formattedError.statusCode,
    message: formattedError.message,
    ...(formattedError.errors && {
      errors: formattedError.errors,
    }),
  });
};
