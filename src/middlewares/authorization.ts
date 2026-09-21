import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../../prisma/generated/prisma/enums";
import catchAsync from "../utils/catchAsync";
import { AppError } from "../errors/AppError";
import httpStatus from "http-status";

export const authorization = (...roles: UserRole[]) => {
  return catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
      }
      const userRole = req.user.role;
      if (!roles.includes(userRole)) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "You are not authorized to access this resource",
        );
      }
      next();
    },
  );
};
