import jwt from "jsonwebtoken";
import type { JwtUserPayload } from "../modules/auth/auth.type";
import type { StringValue } from "ms";

import httpStatus from "http-status";
import { AppError } from "../errors/AppError";
export const signToken = (
  jwtPayload: JwtUserPayload,
  secret: string,
  expiry: StringValue,
) => {
  const token = jwt.sign(jwtPayload, secret, { expiresIn: expiry });
  return token;
};

export const verifyToken = (token: string, secret: string): JwtUserPayload => {
  try {
    return jwt.verify(token, secret) as JwtUserPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Token has expired");
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Token is not active yet");
    }
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid token");
  }
};
