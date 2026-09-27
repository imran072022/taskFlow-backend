import type Stripe from "stripe";
import type { Subscription } from "../../../prisma/generated/prisma/client";
import {
  BillingInterval,
  PaymentStatus,
  PaymentType,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../prisma/generated/prisma/enums";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import type { TSelectPlan } from "./payment.type";
import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";

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

export const handleCheckoutSessionCompleted = async (event: Stripe.Event) => {
  const session = event.data.object as Stripe.Checkout.Session;

  const { organizationId, plan, billingInterval } = session.metadata ?? {};

  if (!organizationId || !plan) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Missing checkout session metadata",
    );
  }

  if (plan === SubscriptionPlan.LIFETIME) {
    if (session.mode !== "payment") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid checkout mode for lifetime plan",
      );
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;

    if (session.amount_total === null || session.currency === null) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Missing payment amount/currency",
      );
    }

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          organizationId,
          amount: session.amount_total,
          currency: session.currency,
          status: PaymentStatus.COMPLETED,
          type: PaymentType.LIFETIME,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
        },
      }),

      prisma.subscription.upsert({
        where: {
          organizationId,
        },
        create: {
          organizationId,
          plan: SubscriptionPlan.LIFETIME,
          billingInterval: null,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : null,
        },
        update: {
          plan: SubscriptionPlan.LIFETIME,
          billingInterval: null,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
      }),
    ]);

    return;
  }

  // Basic / Pro branch
  if (plan === SubscriptionPlan.BASIC || plan === SubscriptionPlan.PRO) {
    if (session.mode !== "subscription") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid checkout mode for recurring plan",
      );
    }

    if (!billingInterval) {
      throw new AppError(httpStatus.BAD_REQUEST, "Missing billing interval");
    }

    const stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;

    if (!stripeSubscriptionId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Missing Stripe subscription ID",
      );
    }

    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : null;

    if (!stripeCustomerId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe customer ID");
    }

    // Subscription activation and payment creation
    // will be handled by invoice.paid.
    return;
  }
};
