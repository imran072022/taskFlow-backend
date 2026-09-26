import { SubscriptionPlan } from "../../../prisma/generated/prisma/enums";

export const PLANS = [
  {
    plan: SubscriptionPlan.FREE,
    name: "Free",
    organizationLimit: 1,
    projectLimit: 2,
    features: [
      "Unlimited members",
      "Task management",
      "Comments",
      "Basic activity history",
    ],
  },
  {
    plan: SubscriptionPlan.BASIC,
    name: "Basic",
    monthlyPrice: 1000,
    yearlyPrice: 10800,
    currency: "USD",
    projectLimit: 8,
    features: [
      "Unlimited members",
      "File attachments",
      "Advanced project management",
      "Recurring billing",
    ],
  },
  {
    plan: SubscriptionPlan.PRO,
    name: "Pro",
    monthlyPrice: 2000,
    yearlyPrice: 21600,
    currency: "USD",
    projectLimit: 20,
    features: [
      "Unlimited members",
      "File attachments",
      "Advanced project management",
      "Priority support",
      "Recurring billing",
    ],
  },
  {
    plan: SubscriptionPlan.LIFETIME,
    name: "Lifetime",
    price: 9900,
    currency: "USD",
    projectLimit: null,
    features: [
      "Unlimited projects",
      "Unlimited members",
      "File attachments",
      "Lifetime access",
      "No recurring billing",
    ],
  },
] as const;
