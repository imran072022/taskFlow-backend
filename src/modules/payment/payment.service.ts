import {
  PaymentStatus,
  PaymentType,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../prisma/generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { PLANS } from "./payment.constants";
import type { TPaymentId, TSelectPlan } from "./payment.type";
import httpStatus from "http-status";
import {
  getStripePriceId,
  handleCheckoutSessionCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  validatePlanChange,
} from "./payment.utils";
import { stripe } from "../../lib/stripe";
import config from "../../config";
import type Stripe from "stripe";

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
  validatePlanChange(organization.subscription, plan); // not for first time plan selection
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

const handleStripeWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(event);
    case "invoice.paid":
      return handleInvoicePaid(event);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event);
    default:
      return;
  }
};

const cancelSubscription = async (userId: string) => {
  const organization = await prisma.organization.findUnique({
    where: {
      ownerId: userId,
    },
    include: {
      subscription: true,
    },
  });

  if (!organization) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }

  const subscription = organization.subscription;

  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, "Subscription not found");
  }

  if (
    subscription.plan === SubscriptionPlan.FREE ||
    subscription.plan === SubscriptionPlan.LIFETIME
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This subscription cannot be cancelled",
    );
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe subscription ID is missing",
    );
  }

  if (subscription.status === SubscriptionStatus.CANCELLED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Subscription is already cancelled",
    );
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  return {
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
};

const refundPayment = async (userId: string, paymentId: TPaymentId) => {
  const organization = await prisma.organization.findUnique({
    where: {
      ownerId: userId,
    },
    include: {
      subscription: true,
    },
  });

  if (!organization) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }

  const subscription = organization.subscription;

  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, "Subscription not found");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      organizationId: organization.id,
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  if (payment.status !== PaymentStatus.COMPLETED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only completed payments can be refunded",
    );
  }

  if (payment.refundedAmount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment has already been refunded",
    );
  }

  if (!payment.stripePaymentIntentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe payment intent ID is missing",
    );
  }

  if (payment.type === PaymentType.SUBSCRIPTION) {
    if (!subscription.stripeSubscriptionId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Stripe subscription ID is missing",
      );
    }

    if (payment.stripeSubscriptionId !== subscription.stripeSubscriptionId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Payment does not belong to the current subscription",
      );
    }
  }

  if (payment.type === PaymentType.LIFETIME) {
    if (subscription.plan !== SubscriptionPlan.LIFETIME) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Payment does not belong to the current subscription",
      );
    }
  }

  const elapsedTime = Date.now() - payment.createdAt.getTime();

  const threeDays = 3 * 24 * 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  let refundAmount: number;

  if (elapsedTime <= threeDays) {
    refundAmount = payment.amount;
  } else if (elapsedTime <= sevenDays) {
    refundAmount = Math.floor(payment.amount / 2);
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, "Refund period has expired");
  }

  const refund = await stripe.refunds.create(
    {
      payment_intent: payment.stripePaymentIntentId,
      amount: refundAmount,
      metadata: {
        paymentId: payment.id,
        organizationId: organization.id,
      },
    },
    {
      idempotencyKey: `refund:${payment.id}`,
    },
  );

  if (refund.status !== "succeeded") {
    throw new AppError(httpStatus.BAD_REQUEST, "Refund was not successful");
  }

  const status =
    refundAmount === payment.amount
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

  await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      refundedAmount: refundAmount,
      status,
    },
  });

  if (payment.type === PaymentType.LIFETIME) {
    await prisma.subscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        plan: SubscriptionPlan.FREE,
        billingInterval: null,
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      },
    });
  } else {
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId!);
  }

  return {
    message:
      refundAmount === payment.amount
        ? "Payment refunded successfully"
        : "50% refund processed successfully",
    refundAmount,
    currency: payment.currency,
    refundId: refund.id,
  };
};

export const paymentsService = {
  getPlans,
  selectPlans,
  handleStripeWebhook,
  cancelSubscription,
  refundPayment,
};
