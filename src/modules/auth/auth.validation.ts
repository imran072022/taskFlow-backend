import z, { email } from "zod";
import {
  OrganizationSize,
  UserRole,
} from "../../../prisma/generated/prisma/enums";

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters.")
      .max(30, "Name cannot exceed 30 characters."),
    email: z
      .email("Invalid email address.")
      .transform((value) => value.trim().toLowerCase()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(32, "Password cannot exceed 32 characters.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/\d/, "Password must contain at least one number.")
      .regex(
        /[!@#$%^&*(),.?":{}|<>_\-\\[\]/`~+=;'']/,
        "Password must contain at least one special character.",
      ),
    role: z.enum([UserRole.OWNER, UserRole.MEMBER], {
      message: "Role must be either OWNER or MEMBER.",
    }),
  }),
});

export const verifyOtpSchema = z.object({
  body: z
    .object({
      verificationId: z.string().trim().min(1, "Verification ID is required."),
      otp: z
        .string()
        .trim()
        .min(6, "OTP must be exactly 6 characters.")
        .max(6, "OTP must be exactly 6 characters."),
    })
    .strict(),
});

export const googleAuthSchema = z.object({
  body: z
    .object({
      idToken: z.string().trim().min(1, "Google ID token is required."),
      role: z.enum([UserRole.MEMBER, UserRole.OWNER], {
        message: "Role must be either OWNER or MEMBER.",
      }),
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z
        .email("Invalid email address.")
        .transform((value) => value.trim().toLowerCase()),
      password: z.string().min(1, "Password is required."),
    })
    .strict(),
});

export const createOrganizationSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(3, "Organization name must be at least 3 characters long")
        .max(30, "Organization name cannot exceed 30 characters"),

      description: z
        .string()
        .trim()
        .min(1, "Description cannot be empty")
        .max(500, "Description cannot exceed 500 characters"),

      industry: z
        .string()
        .trim()
        .min(1, "Industry cannot be empty")
        .max(100, "Industry cannot exceed 100 characters"),

      size: z.enum([
        OrganizationSize.SOLO,
        OrganizationSize.TWO_TO_TEN,
        OrganizationSize.ELEVEN_TO_FIFTY,
        OrganizationSize.FIFTY_ONE_TO_TWO_HUNDRED,
        OrganizationSize.TWO_HUNDRED_PLUS,
      ]),
      website: z.url("Invalid website URL").optional(),
    })
    .strict(),
});

export const forgotPassSchema = z.object({
  body: z
    .object({
      email: z
        .email("Invalid email address")
        .transform((value) => value.trim().toLowerCase()),
    })
    .strict(),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      resetToken: z.string().trim(),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters.")
        .max(32, "Password cannot exceed 32 characters.")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
        .regex(/\d/, "Password must contain at least one number.")
        .regex(
          /[!@#$%^&*(),.?":{}|<>\-_\[\]/`~+=;'']/,
          "Password must contain at least one special character.",
        ),
      confirmPassword: z.string(),
    })
    .strict()
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    }),
});
