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
import { stripe } from "../../lib/stripe";

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
// this util is for handling not-first time subscribing
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

  const { organizationId, plan } = session.metadata ?? {};

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
};

export const handleInvoicePaid = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionDetails = invoice.parent?.subscription_details;
  if (!subscriptionDetails) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Missing subscription details in invoice",
    );
  }
  const { organizationId, plan, billingInterval } =
    subscriptionDetails.metadata ?? {};
  if (!organizationId || !plan || !billingInterval) {
    throw new AppError(httpStatus.BAD_REQUEST, "Missing subscription metadata");
  }

  if (plan !== SubscriptionPlan.BASIC && plan !== SubscriptionPlan.PRO) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid plan for recurring invoice",
    );
  }

  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : null;
  if (!stripeCustomerId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe customer ID");
  }

  const stripeSubscriptionId =
    typeof subscriptionDetails.subscription === "string"
      ? subscriptionDetails.subscription
      : null;
  if (!stripeSubscriptionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Missing Stripe subscription ID",
    );
  }
  const subscriptionLine = invoice.lines.data.find(
    (line) =>
      line.parent?.subscription_item_details?.subscription ===
      stripeSubscriptionId,
  );

  if (!subscriptionLine?.period) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Missing subscription line period",
    );
  }
  const currentPeriodEnd = new Date(subscriptionLine.period.end * 1000);

  const subscription = await prisma.subscription.findUnique({
    where: {
      stripeSubscriptionId,
    },
  });

  // Subscription not available
  if (!subscription) {
    // Recurring payment,  throw
    if (invoice.billing_reason !== "subscription_create") {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Subscription record not found for recurring invoice",
      );
    }
    // First time payment, then create records
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          organizationId,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: PaymentStatus.COMPLETED,
          type: PaymentType.SUBSCRIPTION,
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId,
        },
      }),

      prisma.subscription.upsert({
        where: {
          organizationId,
        },
        create: {
          organizationId,
          plan: plan as SubscriptionPlan,
          billingInterval: billingInterval as BillingInterval,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId,
          stripeSubscriptionId,
          currentPeriodEnd,
        },
        update: {
          plan: plan as SubscriptionPlan,
          billingInterval: billingInterval as BillingInterval,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId,
          stripeSubscriptionId,
          currentPeriodEnd,
        },
      }),
    ]);

    return;
  }

  // Subsequent recurring payment, subscription already available
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        organizationId: subscription.organizationId,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: PaymentStatus.COMPLETED,
        type: PaymentType.SUBSCRIPTION,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId,
      },
    }),

    prisma.subscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd,
      },
    }),
  ]);
};

export const handleInvoicePaymentFailed = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionDetails = invoice.parent?.subscription_details;

  if (!subscriptionDetails) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Missing subscription details in invoice",
    );
  }

  const stripeSubscriptionId =
    typeof subscriptionDetails.subscription === "string"
      ? subscriptionDetails.subscription
      : null;

  if (!stripeSubscriptionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Missing Stripe subscription ID",
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: {
      stripeSubscriptionId,
    },
  });

  if (!subscription) {
    return;
  }

  await prisma.$transaction([
    prisma.payment.upsert({
      where: {
        stripeInvoiceId: invoice.id,
      },
      create: {
        organizationId: subscription.organizationId,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: PaymentStatus.FAILED,
        type: PaymentType.SUBSCRIPTION,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId,
      },
      update: {
        status: PaymentStatus.FAILED,
      },
    }),

    prisma.subscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    }),
  ]);
};
