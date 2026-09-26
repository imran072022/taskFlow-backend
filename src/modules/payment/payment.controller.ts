import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { paymentsService } from "./payment.service";
import type { Request, Response } from "express";
import type { TSelectPlanLocals } from "./payment.type";

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

export const paymentsController = {
  getPlans,
  selectPlans,
};
