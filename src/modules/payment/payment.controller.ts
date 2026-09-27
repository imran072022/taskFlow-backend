import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { paymentsService } from "./payment.service";
import type { Request, Response } from "express";
import type { TSelectPlanLocals } from "./payment.type";
import { AppError } from "../../errors/AppError";
import { stripe } from "../../lib/stripe";
import config from "../../config";

const getPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = await paymentsService.getPlans();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Plans retrieved successfully",
    data: result,
  });
});

const selectPlans = catchAsync(
  async (req: Request, res: Response<unknown, TSelectPlanLocals>) => {
    const result = await paymentsService.selectPlans(
      req.user.id,
      res.locals.validatedData.body,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "Plan selected successfully",
      data: result,
    });
  },
);

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe signature");
  }
  const event = stripe.webhooks.constructEvent(
    req.body,
    signature,
    config.stripe_webhook_secret,
  );
  await paymentsService.handleStripeWebhook(event);
  res.status(200).json({ received: true });
});

export const paymentsController = {
  getPlans,
  selectPlans,
  handleWebhook,
};
