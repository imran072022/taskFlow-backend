import { Router } from "express";
import { authController } from "./auth.controller";
import { authentication } from "../../middlewares/authentication";
import { authorization } from "../../middlewares/authorization";
import {
  googleAuthSchema,
  loginSchema,
  registerSchema,
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

export const authRoutes = router;
