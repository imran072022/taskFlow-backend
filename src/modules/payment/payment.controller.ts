import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { paymentsService } from "./payment.service";
import type { Request, Response } from "express";
import type { TPaymentIdParamsLocals, TSelectPlanLocals } from "./payment.type";
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

const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.cancelSubscription(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message:
      "Subscription will be cancelled at the end of the current billing period",
    data: result,
  });
});

const refundPayment = catchAsync(
  async (req: Request, res: Response<unknown, TPaymentIdParamsLocals>) => {
    const { paymentId } = res.locals.validatedData.params;
    const result = await paymentsService.refundPayment(req.user.id, paymentId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: result.message,
      data: {
        refundAmount: result.refundAmount,
        currency: result.currency,
        refundId: result.refundId,
      },
    });
  },
);

export const paymentsController = {
  getPlans,
  selectPlans,
  handleWebhook,
  cancelSubscription,
  refundPayment,
};
