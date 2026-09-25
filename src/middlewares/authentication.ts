import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import httpStatus from "http-status";
import { verifyToken } from "../utils/jwt";

import { getUserById } from "../modules/auth/auth.utils";
import catchAsync from "../utils/catchAsync";
import config from "../config";

export const authentication = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, "You need to login first");
    }
    const verifiedToken = verifyToken(token, config.jwt_access_secret);
    await getUserById(verifiedToken.id);
    req.user = verifiedToken;
    next();
  },
);
