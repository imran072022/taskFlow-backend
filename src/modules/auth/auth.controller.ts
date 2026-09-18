import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import type { TRegisterPayloadLocals } from "./auth.type";

const register = catchAsync(
  async (req: Request, res: Response<unknown, TRegisterPayloadLocals>) => {},
);

export const authController = {
  register,
};
