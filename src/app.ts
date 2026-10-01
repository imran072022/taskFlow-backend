import type { Application } from "express";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound } from "./middlewares/notFound";
import { authRoutes } from "./modules/auth/auth.route";
import { globalErrorHandler } from "./errors/globalErrorHandler";
import { paymentRoutes } from "./modules/payment/payment.route";
import { paymentsController } from "./modules/payment/payment.controller";
import { organizationRoutes } from "./modules/organization/organization.route";

const app: Application = express();
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentsController.handleWebhook,
);
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/organizations", organizationRoutes);

app.use(notFound);
app.use(globalErrorHandler);
export default app;
