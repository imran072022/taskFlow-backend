import type z from "zod";
import type {
  googleAuthSchema,
  loginSchema,
  registerSchema,
  verifyOtpSchema,
} from "./auth.validation";
import type { UserRole } from "../../../prisma/generated/prisma/enums";

export type JwtUserPayload = {
  id: string;
  name: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

// register api types
export type TRegisterPayload = z.infer<typeof registerSchema>["body"];
export type TRegisterPayloadLocals = {
  validatedData: z.infer<typeof registerSchema>;
};

// OTP related types
export type TOtpPurpose = "REGISTER" | "FORGOT_PASSWORD";
export type TRegisterOtpData = {
  purpose: "REGISTER";
  name: string;
  email: string;
  password: string;
  role: UserRole;
};
export type TForgotPassData = {
  purpose: "FORGOT_PASSWORD";
  userId: string;
};

// verify otp api types
export type TVerifyOtp = z.infer<typeof verifyOtpSchema>["body"];
export type TVerifyOtpLocals = {
  validatedData: z.infer<typeof verifyOtpSchema>;
};

// google login
export type TGoogleAuthPayload = z.infer<typeof googleAuthSchema>["body"];
export type TGoogleAuthPayloadLocals = {
  validatedData: z.infer<typeof googleAuthSchema>;
};

// credential login api types
export type TLoginPayload = z.infer<typeof loginSchema>["body"];
export type TLoginPayloadLocals = {
  validatedData: z.infer<typeof loginSchema>;
};
