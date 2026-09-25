import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import type {
  TGoogleAuthPayloadLocals,
  TLoginPayloadLocals,
  TRegisterPayloadLocals,
  TVerifyOtpLocals,
} from "./auth.type";
import { authService } from "./auth.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import config from "../../config";
import { AppError } from "../../errors/AppError";

const credentialRegister = catchAsync(
  async (req: Request, res: Response<unknown, TRegisterPayloadLocals>) => {
    const result = await authService.credentialRegister(
      res.locals.validatedData.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Verification id sent successfully",
      data: result,
    });
  },
);

const verifyRegistrationOtp = catchAsync(
  async (req: Request, res: Response<unknown, TVerifyOtpLocals>) => {
    const result = await authService.verifyRegistrationOtp(
      res.locals.validatedData.body,
    );
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: config.node_env === "PRODUCTION" ? true : false,
      sameSite: config.node_env === "PRODUCTION" ? "none" : "lax",
    });
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "Registration successful",
      data: result,
    });
  },
);

const google = catchAsync(
  async (req: Request, res: Response<unknown, TGoogleAuthPayloadLocals>) => {
    const result = await authService.google(res.locals.validatedData.body);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: config.node_env === "PRODUCTION" ? true : false,
      sameSite: config.node_env === "PRODUCTION" ? "none" : "lax",
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Google authentication successful",
      data: result,
    });
  },
);

const credentialLogin = catchAsync(
  async (req: Request, res: Response<unknown, TLoginPayloadLocals>) => {
    const result = await authService.credentialLogin(
      res.locals.validatedData.body,
    );
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: config.node_env === "PRODUCTION" ? true : false,
      sameSite: config.node_env === "PRODUCTION" ? "none" : "lax",
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Login successful",
      data: result,
    });
  },
);

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is missing.");
  }
  const result = await authService.refreshToken(refreshToken);
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: config.node_env === "PRODUCTION",
    sameSite: config.node_env === "PRODUCTION" ? "none" : "lax",
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Token refreshed successfully",
    data: {
      accessToken: result.accessToken,
    },
  });
});
const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "User retrieved successfully",
    data: user,
  });
});
const logout = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  await authService.logout(refreshToken);

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.node_env === "PRODUCTION",
    sameSite: config.node_env === "PRODUCTION" ? "none" : "lax",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Logged out successfully",
    data: null,
  });
});
export const authController = {
  credentialRegister,
  verifyRegistrationOtp,
  google,
  credentialLogin,
  refreshToken,
  getMe,
  logout,
};
