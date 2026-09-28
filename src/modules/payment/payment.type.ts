import type z from "zod";
import type {
  refundParamsSchema,
  selectPlanSchema,
} from "./payment.validation";

export type TSelectPlan = z.infer<typeof selectPlanSchema>["body"];
export type TSelectPlanLocals = {
  validatedData: z.infer<typeof selectPlanSchema>;
};

export type TPaymentId = z.infer<
  typeof refundParamsSchema
>["params"]["paymentId"];
export type TPaymentIdParamsLocals = {
  validatedData: z.infer<typeof refundParamsSchema>;
};
