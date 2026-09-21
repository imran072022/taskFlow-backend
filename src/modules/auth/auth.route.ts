import { Router } from "express";
import { authController } from "./auth.controller";
import { authentication } from "../../middlewares/authentication";
import { authorization } from "../../middlewares/authorization";
import { registerSchema, verifyOtpSchema } from "./auth.validation";
import { UserRole } from "../../../prisma/generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  authController.register,
);

router.post(
  "/verify-otp",
  validateRequest(verifyOtpSchema),
  authController.verifyRegistrationOtp,
);
export const authRoutes = router;
