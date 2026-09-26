import type z from "zod";
import type { selectPlanSchema } from "./payment.validation";

export type TSelectPlan = z.infer<typeof selectPlanSchema>["body"];
export type TSelectPlanLocals = {
  validatedData: z.infer<typeof selectPlanSchema>;
};
