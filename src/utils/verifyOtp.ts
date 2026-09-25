import { AppError } from "../errors/AppError";
import { redisClient } from "../lib/redis";
import type { TOtpData, TVerifyOtp } from "../modules/auth/auth.type";
import httpStatus from "http-status";

export const verifyOtp = async (payload: TVerifyOtp) => {
  const { verificationId, otp } = payload;
  const redisKey = `otp:${verificationId}`;
  const storedData = await redisClient.get(redisKey);
  if (!storedData) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP data expired / invalid");
  }

  const parsedOtpData = JSON.parse(storedData) as TOtpData & {
    otp: number;
  };
  if (Number(otp) !== parsedOtpData.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }
  await redisClient.del(redisKey);
  const { otp: _, ...verifiedData } = parsedOtpData;
  return verifiedData;
};
