import type { User } from "../../../prisma/generated/prisma/client";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import httpStatus from "http-status";
import type { JwtUserPayload } from "./auth.type";
import { signToken } from "../../utils/jwt";
import config from "../../config";
import { hashRefreshToken } from "../../utils/hashRefreshToken";
import { getRefreshTokenExpiry } from "../../utils/getRefreshTokenExpiry";

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      isSuspended: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

export const generateAuthTokens = async (user: JwtUserPayload) => {
  const jwtPayload: JwtUserPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  const accessToken = signToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_token_expiry,
  );

  const refreshToken = signToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_token_expiry,
  );

  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshSession.upsert({
    where: {
      userId: user.id,
    },
    update: {
      tokenHash: refreshTokenHash,
      expiresAt: getRefreshTokenExpiry(),
      revokedAt: null,
    },
    create: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};
