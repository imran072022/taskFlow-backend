import type z from "zod";
import type {
  createOrganizationSchema,
  forgotPassSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
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

// (1). register api types
export type TRegisterPayload = z.infer<typeof registerSchema>["body"];
export type TRegisterPayloadLocals = {
  validatedData: z.infer<typeof registerSchema>;
};

// ============  OTP related types  ============== //
export type TOtpPurpose = "REGISTER" | "FORGOT_PASSWORD"; //(used in both places)
// register otp
export type TRegisterOtpData = {
  purpose: "REGISTER";
  name: string;
  email: string;
  password: string;
  role: UserRole;
};
// (2). forgot password api
export type TForgotPasswordOtpData = {
  purpose: "FORGOT_PASSWORD";
  userId: string;
  otp: number;
};
export type TForgotPassEmail = z.infer<
  typeof forgotPassSchema
>["body"]["email"];
export type TForgotPassEmailLocals = {
  validatedData: z.infer<typeof forgotPassSchema>;
};

export type TOtpData = TRegisterOtpData | TForgotPasswordOtpData; // (used in both places)

// (3). verify otp api types (used in both places)
export type TVerifyOtp = z.infer<typeof verifyOtpSchema>["body"];
export type TVerifyOtpLocals = {
  validatedData: z.infer<typeof verifyOtpSchema>;
};
// (4). verify forgot-pass-otp api
export type TResetPassPayload = {
  id: string;
  purpose: "RESET_PASSWORD";
};
// (5). reset password api
export type TResetPassword = z.infer<typeof resetPasswordSchema>["body"];
export type TResetPasswordLocals = {
  validatedData: z.infer<typeof resetPasswordSchema>;
};
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = //

// (6). google login
export type TGoogleAuthPayload = z.infer<typeof googleAuthSchema>["body"];
export type TGoogleAuthPayloadLocals = {
  validatedData: z.infer<typeof googleAuthSchema>;
};

// (7).  credential login api types
export type TLoginPayload = z.infer<typeof loginSchema>["body"];
export type TLoginPayloadLocals = {
  validatedData: z.infer<typeof loginSchema>;
};

// (8).  organization onboarding api types
export type TCreateOrg = z.infer<typeof createOrganizationSchema>["body"];
export type TCreateOrgLocals = {
  validatedData: z.infer<typeof createOrganizationSchema>;
};
