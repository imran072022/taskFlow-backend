import { render } from "@react-email/render";
import RegistrationOtpEmail from "../email_templates/RegistrationOtp";
import { resendClient } from "../lib/resend";
import { AppError } from "../errors/AppError";
import httpStatus from "http-status";

type TRegisterOtpUtilPayload = {
  email: string;
  otp: number;
};
export const sendRegistrationOtp = async (payload: TRegisterOtpUtilPayload) => {
  const { email, otp } = payload;
  const html = await render(RegistrationOtpEmail({ otp }));
  const { error } = await resendClient.emails.send({
    from: "Task Flow <onboarding@resend.dev>",
    to: email,
    subject: "Account Registration OTP",
    html,
  });
  if (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to send verification email",
    );
  }
};
