import type { Application } from "express";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound } from "./middlewares/notFound";
import { authRoutes } from "./modules/auth/auth.route";
import { globalErrorHandler } from "./errors/globalErrorHandler";

const app: Application = express();
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

app.use(notFound);
app.use(globalErrorHandler);
export default app;
