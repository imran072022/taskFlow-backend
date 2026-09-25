import { render } from "@react-email/render";

import { AppError } from "../errors/AppError";
import httpStatus from "http-status";
import config from "../config";
import { brevoClient } from "../lib/brevoClient";

type TSendEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = async ({ to, subject, html }: TSendEmailPayload) => {
  try {
    await brevoClient.transactionalEmails.sendTransacEmail({
      sender: {
        name: "Task Flow",
        email: config.brevo_sender_email,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
  } catch (error) {
    console.error("Brevo email error:", error);

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to send email",
    );
  }
};
