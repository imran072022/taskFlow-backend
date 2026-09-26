import z from "zod";
import {
  BillingInterval,
  SubscriptionPlan,
} from "../../../prisma/generated/prisma/enums";

export const selectPlanSchema = z.object({
  body: z
    .object({
      plan: z.enum([
        SubscriptionPlan.FREE,
        SubscriptionPlan.BASIC,
        SubscriptionPlan.PRO,
        SubscriptionPlan.LIFETIME,
      ]),
      billingInterval: z
        .enum([BillingInterval.MONTH, BillingInterval.YEAR])
        .optional(),
    })
    .superRefine((data, ctx) => {
      const requiresInterval =
        data.plan === SubscriptionPlan.BASIC ||
        data.plan === SubscriptionPlan.PRO;

      if (requiresInterval && data.billingInterval === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["billingInterval"],
          message: "Billing interval is required for this plan",
        });
      }

      if (!requiresInterval && data.billingInterval !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["billingInterval"],
          message: "Billing interval is not applicable to this plan",
        });
      }
    }),
});
