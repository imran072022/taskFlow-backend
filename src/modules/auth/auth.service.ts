import bcrypt from "bcryptjs";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type {
  JwtUserPayload,
  TGoogleAuthPayload,
  TLoginPayload,
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
import { render } from "@react-email/render";
import RegistrationOtpEmail from "../../email_templates/RegistrationOtp";
import { resendClient } from "../../lib/resend";
import { sendRegistrationOtp } from "../../utils/sendRegistrationOtp";
import { googleClient } from "../../lib/google";
import type { TokenPayload } from "google-auth-library";

const credentialRegister = async (payload: TRegisterPayload) => {
  const { name, email, password, role } = payload;
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (user) {
    if (!user.password && user.googleId) {
      throw new AppError(
        httpStatus.CONFLICT,
        "An account already exists with this email. Please continue with Google.",
      );
    }

    throw new AppError(
      httpStatus.CONFLICT,
      "Account already exists. Please sign in with your password.",
    );
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
  sendRegistrationOtp({ email, otp });
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

const google = async (payload: TGoogleAuthPayload) => {
  const { idToken, role } = payload;
  let googlePayload: TokenPayload | undefined | null;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google_client_id,
    });

    googlePayload = ticket.getPayload();
  } catch (error) {
    console.error("Google ID token verification failed:", error);

    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired Google ID token",
    );
  }

  if (!googlePayload) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired Google ID token",
    );
  }

  if (!googlePayload.email || !googlePayload.email_verified) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Google email is not verified");
  }

  const { sub: googleId, email, name } = googlePayload;

  let user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (!user) {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      throw new AppError(
        httpStatus.CONFLICT,
        "An account already exists with this email. Please sign in with your password.",
      );
    }

    user = await prisma.user.create({
      data: {
        name: name ?? "Google User",
        email,
        googleId,
        role,
        isVerified: true,
      },
    });
  }

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

const credentialLogin = async (payload: TLoginPayload) => {
  const { email, password } = payload;
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "Account doesn't exist");
  }

  if (!user.password && user.googleId) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This account was registered with Google. Please continue with Google.",
    );
  }
  if (!user.password) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

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
  return { accessToken, refreshToken };
};

export const authService = {
  credentialRegister,
  verifyRegistrationOtp,
  google,
  credentialLogin,
};
