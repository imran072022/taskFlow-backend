import { Router } from "express";
import { paymentsController } from "./payment.controller";
import { authentication } from "../../middlewares/authentication";
import { authorization } from "../../middlewares/authorization";
import { UserRole } from "../../../prisma/generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import { selectPlanSchema } from "./payment.validation";

const router = Router();

router.get(
  "/plans",
  authentication,
  authorization(UserRole.OWNER),
  paymentsController.getPlans,
);

router.post(
  "/select-plans",
  authentication,
  authorization(UserRole.OWNER),
  validateRequest(selectPlanSchema),
  paymentsController.selectPlans,
);

export const paymentRoutes = router;
