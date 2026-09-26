import type { Subscription } from "../../../prisma/generated/prisma/client";
import {
  BillingInterval,
  SubscriptionPlan,
} from "../../../prisma/generated/prisma/enums";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import type { TSelectPlan } from "./payment.type";
import httpStatus from "http-status";

export const getStripePriceId = (payload: TSelectPlan) => {
  const { plan, billingInterval } = payload;

  if (plan === SubscriptionPlan.BASIC) {
    return billingInterval === BillingInterval.MONTH
      ? config.stripe_basic_monthly_price_id
      : config.stripe_basic_yearly_price_id;
  }
  if (plan === SubscriptionPlan.PRO) {
    return billingInterval === BillingInterval.MONTH
      ? config.stripe_pro_monthly_price_id
      : config.stripe_pro_yearly_price_id;
  }
  if (plan === SubscriptionPlan.LIFETIME) {
    return config.stripe_lifetime_price_id;
  }
  return null;
};

export const validatePlanChange = (
  currentSubscription: Subscription | null,
  newPlan: SubscriptionPlan,
) => {
  if (!currentSubscription) {
    return;
  }

  const currentPlan = currentSubscription.plan;

  if (currentPlan === newPlan) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You are already subscribed to this plan",
    );
  }

  if (currentPlan === SubscriptionPlan.LIFETIME) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Lifetime subscription cannot be changed",
    );
  }

  if (currentPlan === SubscriptionPlan.FREE) {
    return;
  }

  if (currentPlan === SubscriptionPlan.BASIC) {
    if (
      newPlan === SubscriptionPlan.PRO ||
      newPlan === SubscriptionPlan.LIFETIME
    ) {
      return;
    }

    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot select this plan while Basic is active",
    );
  }

  if (currentPlan === SubscriptionPlan.PRO) {
    if (newPlan === SubscriptionPlan.LIFETIME) {
      return;
    }

    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot select this plan while Pro is active",
    );
  }
};
