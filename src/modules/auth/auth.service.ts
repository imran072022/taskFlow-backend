import bcrypt from "bcryptjs";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type {
  JwtUserPayload,
  TRegisterOtpData,
  TRegisterPayload,
  TVerifyOtp,
} from "./auth.type";
import httpStatus from "http-status";
import config from "../../config";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import { verifyOtp } from "../../utils/verifyOtp";
import { signToken } from "../../utils/jwt";

const register = async (payload: TRegisterPayload) => {
  const { name, email, password, role } = payload;
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (user) {
    throw new AppError(httpStatus.CONFLICT, "Account already exists");
  }
  const verificationId = crypto.randomUUID();
  const otp = crypto.randomInt(100000, 1000000);

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_round),
  );
  const registerOtpData: TRegisterOtpData = {
    purpose: "REGISTER",
    name,
    email,
    password: hashedPassword,
    role,
  };

  await redisClient.set(
    `otp:${verificationId}`,
    JSON.stringify({ ...registerOtpData, otp }),
    {
      expiration: {
        type: "EX",
        value: 5 * 60,
      },
    },
  );

  return { verificationId };
};

const verifyRegistrationOtp = async (payload: TVerifyOtp) => {
  const otpData = await verifyOtp(payload);
  const { name, email, password, role, purpose } = otpData;

  if (purpose !== "REGISTER") {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid verification purpose");
  }
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password,
      role,
    },
    omit: {
      password: true,
    },
  });
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
    config.jwt_access_secret,
    config.jwt_refresh_token_expiry,
  );
  return { user, accessToken, refreshToken };
};

export const authService = {
  register,
  verifyRegistrationOtp,
};
