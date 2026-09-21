import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import type { TRegisterPayloadLocals, TVerifyOtpLocals } from "./auth.type";
import { authService } from "./auth.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import config from "../../config";

const register = catchAsync(
  async (req: Request, res: Response<unknown, TRegisterPayloadLocals>) => {
    const result = await authService.register(res.locals.validatedData.body);
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
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: config.node_env === "PRODUCTION",
      sameSite: "none",
    });
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: config.node_env === "PRODUCTION",
      sameSite: "none",
    });
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "Registration successful",
      data: result,
    });
  },
);

export const authController = {
  register,
  verifyRegistrationOtp,
};
