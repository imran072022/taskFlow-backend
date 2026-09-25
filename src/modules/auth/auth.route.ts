import { Router } from "express";
import { authController } from "./auth.controller";
import { authentication } from "../../middlewares/authentication";
import { authorization } from "../../middlewares/authorization";
import {
  createOrganizationSchema,
  forgotPassSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./auth.validation";
import { UserRole } from "../../../prisma/generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  authController.credentialRegister,
);

router.post(
  "/verify-otp",
  validateRequest(verifyOtpSchema),
  authController.verifyRegistrationOtp,
);

router.post(
  "/google",
  validateRequest(googleAuthSchema),
  authController.google,
);

router.post(
  "/login",
  validateRequest(loginSchema),
  authController.credentialLogin,
);

router.post("/refresh-token", authController.refreshToken);

router.get(
  "/me",
  authentication,
  authorization(UserRole.ADMIN, UserRole.MEMBER, UserRole.OWNER),
  authController.getMe,
);

router.post(
  "/logout",
  authentication,
  authorization(UserRole.ADMIN, UserRole.MEMBER, UserRole.OWNER),
  authController.logout,
);

router.post(
  "/create-organization",
  authentication,
  authorization(UserRole.OWNER),
  validateRequest(createOrganizationSchema),
  authController.completeOrganization,
);

router.post(
  "/forgot-password",
  validateRequest(forgotPassSchema),
  authController.forgotPassword,
);

router.post(
  "/verify-reset-otp",
  validateRequest(verifyOtpSchema),
  authController.verifyForgotPassOtp,
);
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  authController.resetPassword,
);

export const authRoutes = router;
