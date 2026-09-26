import {
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../prisma/generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { PLANS } from "./payment.constants";
import type { TSelectPlan } from "./payment.type";
import httpStatus from "http-status";
import { getStripePriceId, validatePlanChange } from "./payment.utils";
import { stripe } from "../../lib/stripe";
import config from "../../config";

const getPlans = async () => {
  return PLANS;
};

const selectPlans = async (userId: string, payload: TSelectPlan) => {
  const { plan, billingInterval } = payload;
  const organization = await prisma.organization.findUnique({
    where: {
      ownerId: userId,
    },
    select: {
      id: true,
      subscription: true,
      owner: {
        select: {
          email: true,
        },
      },
    },
  });
  if (!organization) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }
  validatePlanChange(organization.subscription, plan);
  if (plan === SubscriptionPlan.FREE) {
    const subscription = await prisma.subscription.upsert({
      where: {
        organizationId: organization.id,
      },
      update: {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      },
      create: {
        organizationId: organization.id,
        plan,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    return subscription;
  }
  const stripePriceId = getStripePriceId(payload);
  if (!stripePriceId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid plan configuration");
  }

  if (plan === SubscriptionPlan.LIFETIME) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: organization.owner.email,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        organizationId: organization.id,
        plan,
      },
      success_url: `${config.frontend_url}/payment/success`,
      cancel_url: `${config.frontend_url}/payment/cancel`,
    });
    return { checkoutUrl: session.url };
  }
  if (!billingInterval) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Billing interval (MONTH or YEAR) is required for subscription plans.",
    );
  }
  const session = await stripe.checkout.sessions.create({
    customer_email: organization.owner.email,
    mode: "subscription",
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      organizationId: organization.id,
      plan,
      billingInterval,
    },
    subscription_data: {
      metadata: {
        organizationId: organization.id,
        plan,
        billingInterval,
      },
    },
    success_url: `${config.frontend_url}/payment/success`,
    cancel_url: `${config.frontend_url}/payment/cancel`,
  });

  return {
    checkoutUrl: session.url,
  };
};

export const paymentsService = {
  getPlans,
  selectPlans,
};
