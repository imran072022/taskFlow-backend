import bcrypt from "bcryptjs";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type {
  JwtUserPayload,
  TCreateOrg,
  TForgotPassEmail,
  TForgotPasswordOtpData,
  TGoogleAuthPayload,
  TLoginPayload,
  TRegisterOtpData,
  TRegisterPayload,
  TResetPassPayload,
  TResetPassword,
  TVerifyOtp,
} from "./auth.type";
import httpStatus from "http-status";
import config from "../../config";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import { verifyOtp } from "../../utils/verifyOtp";
import { signToken, verifyToken } from "../../utils/jwt";
import { sendEmail } from "../../utils/sendEmail";
import { googleClient } from "../../lib/google";
import type { TokenPayload } from "google-auth-library";
import { generateAuthTokens, getUserById } from "./auth.utils";
import { hashRefreshToken } from "../../utils/hashRefreshToken";
import { getRefreshTokenExpiry } from "../../utils/getRefreshTokenExpiry";
import jwt from "jsonwebtoken";
import ForgotPasswordOtpEmail from "../../email_templates/ForgotPassOtpEmail";
import { render } from "@react-email/render";
import RegistrationOtpEmail from "../../email_templates/RegistrationOtpEmail";

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

  const hashedPassword = await bcrypt.hash(password, config.bcrypt_salt_round);
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
  const html = await render(RegistrationOtpEmail({ otp }));
  sendEmail({ to: email, subject: "Password reset OTP", html });
  return { verificationId };
};

const verifyRegistrationOtp = async (payload: TVerifyOtp) => {
  const otpData = await verifyOtp(payload);

  if (otpData.purpose !== "REGISTER") {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid verification purpose");
  }
  const { name, email, password, role } = otpData;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password,
      role,
      isVerified: true,
    },
    omit: {
      password: true,
    },
  });

  const tokens = await generateAuthTokens(user);
  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
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

  const tokens = await generateAuthTokens(user);

  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
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

  const tokens = await generateAuthTokens(user);
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

const refreshToken = async (refreshToken: string) => {
  const verifiedToken = verifyToken(refreshToken, config.jwt_refresh_secret);
  const tokenHash = hashRefreshToken(refreshToken);

  const session = await prisma.refreshSession.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  if (session.revokedAt || session.expiresAt <= new Date()) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Refresh token is no longer valid",
    );
  }

  if (verifiedToken.id !== session.userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }
  const user = session.user;

  const jwtPayload: JwtUserPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const newAccessToken = signToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_token_expiry,
  );

  const newRefreshToken = signToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_token_expiry,
  );

  await prisma.refreshSession.update({
    where: {
      id: session.id,
    },
    data: {
      tokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: getRefreshTokenExpiry(),
    },
  });
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

const getMe = async (id: string) => {
  const user = await getUserById(id);
  return user;
};

const logout = async (refreshToken: string) => {
  if (refreshToken) {
    const result = await prisma.refreshSession.updateMany({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return result;
  }
};

// onboarding - create organization
const completeOrganization = async (payload: TCreateOrg, userId: string) => {
  const { name, description, industry, size, website } = payload;
  const result = await prisma.organization.create({
    data: {
      name,
      description,
      industry,
      size,
      ...(website !== undefined && { website }),
      ownerId: userId,
    },
  });
  return result;
};

const forgotPassword = async (email: TForgotPassEmail) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.googleId && !user.password) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This account was registered with Google. Please continue with Google.",
    );
  }

  const verificationId = crypto.randomUUID();
  const otp = crypto.randomInt(100000, 1000000);

  const forgotPassData: TForgotPasswordOtpData = {
    purpose: "FORGOT_PASSWORD",
    userId: user.id,
    otp,
  };

  await redisClient.set(
    `otp:${verificationId}`,
    JSON.stringify(forgotPassData),
    {
      expiration: {
        type: "EX",
        value: 5 * 60,
      },
    },
  );
  const html = await render(ForgotPasswordOtpEmail({ otp }));
  sendEmail({ to: email, subject: "Password reset OTP", html });

  return { verificationId };
};

const verifyForgotPassOtp = async (payload: TVerifyOtp) => {
  const otpData = await verifyOtp(payload);

  if (otpData.purpose !== "FORGOT_PASSWORD") {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid verification purpose");
  }
  const resetPassPayload: TResetPassPayload = {
    id: otpData.userId,
    purpose: "RESET_PASSWORD",
  };
  const resetPassToken = jwt.sign(resetPassPayload, config.jwt_access_secret, {
    expiresIn: "5m",
  });
  return { resetPassToken };
};

const resetPassword = async (payload: TResetPassword) => {
  const { resetToken, password: newPassword } = payload;
  const decodedToken = jwt.verify(
    resetToken,
    config.jwt_access_secret,
  ) as TResetPassPayload;
  if (decodedToken.purpose !== "RESET_PASSWORD") {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid password reset token");
  }
  const user = await prisma.user.findUnique({
    where: {
      id: decodedToken.id,
    },
    select: {
      id: true,
      password: true,
    },
  });
  if (!user || !user.password) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "New password must be different from your current password",
    );
  }
  const hashedPassword = await bcrypt.hash(
    newPassword,
    config.bcrypt_salt_round,
  );
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    await tx.refreshSession.updateMany({
      where: {
        userId: decodedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  });
};

export const authService = {
  credentialRegister,
  verifyRegistrationOtp,
  google,
  credentialLogin,
  refreshToken,
  getMe,
  logout,
  completeOrganization,
  forgotPassword,
  verifyForgotPassOtp,
  resetPassword,
};
