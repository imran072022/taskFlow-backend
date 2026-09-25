import { render } from "@react-email/render";
import RegistrationOtpEmail from "../email_templates/RegistrationOtp";

import { AppError } from "../errors/AppError";
import httpStatus from "http-status";
import config from "../config";
import { brevoClient } from "../lib/brevoClient";

type TRegisterOtpUtilPayload = {
  email: string;
  otp: number;
};

export const sendRegistrationOtp = async (payload: TRegisterOtpUtilPayload) => {
  const { email, otp } = payload;

  const html = await render(RegistrationOtpEmail({ otp }));

  try {
    await brevoClient.transactionalEmails.sendTransacEmail({
      sender: {
        name: "Task Flow",
        email: config.brevo_sender_email,
      },
      to: [
        {
          email,
        },
      ],
      subject: "Account Registration OTP",
      htmlContent: html,
    });
  } catch (error) {
    console.error("Brevo email error:", error);

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to send verification email",
    );
  }
};
