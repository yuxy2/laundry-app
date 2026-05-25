import Laundry, { ServiceType } from "../models/laundry";
import Order from "../models/order";
import User from "../models/user";
import crypto from "crypto";
const midtransClient = require("midtrans-client");

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY as string;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

const snap = new midtransClient.Snap({
  isProduction: MIDTRANS_IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
});

export type CheckoutSessionRequest = {
  cartItems: {
    serviceId: string;
    name: string;
    quantity: string;
  }[];
  deliveryDetails: {
    email: string;
    name: string;
    addressLine1: string;
    city: string;
  };
  laundryId: string;
  paymentMethod?: string;
};

export const getOrdersByUserId = async (userId: string) => {
  return await Order.find({ user: userId })
    .populate("laundry")
    .populate("user");
};

export const processMidtransWebhook = async (body: any) => {
  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

  const serverKey = MIDTRANS_SERVER_KEY;
  const hash = crypto.createHash("sha512").update(order_id + status_code + gross_amount + serverKey).digest("hex");

  if (hash !== signature_key) {
    throw new Error("Invalid signature key for Midtrans webhook");
  }

  if (order_id.startsWith("sub-")) {
    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        const parts = order_id.split("-");
        const userId = parts[1];
        const planType = parts[2];

        const user = await User.findById(userId);
        if (!user) {
          throw new Error("User not found for subscription");
        }

        user.isMember = true;
        user.memberType = planType;
        user.quotaRemaining = 70; // 70 kg
        user.memberExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await user.save();
      }
    }
    return;
  }

  const order = await Order.findById(order_id);

  if (!order) {
    throw new Error("Order not found");
  }

  if (transaction_status == "capture" || transaction_status == "settlement") {
    if (fraud_status == "accept" || !fraud_status) {
      order.totalAmount = parseFloat(gross_amount);
      
      // Hitung komisi (Misal Admin memotong 10%)
      const adminFee = order.totalAmount * 0.1;
      const partnerRevenue = order.totalAmount - adminFee;

      order.adminFee = adminFee;
      order.partnerRevenue = partnerRevenue;
      
      order.status = "paid";
      await order.save();
    }
  } else if (
    transaction_status == "cancel" ||
    transaction_status == "deny" ||
    transaction_status == "expire"
  ) {
    order.status = "cancelled";
    await order.save();
  } else if (transaction_status == "pending") {
    order.status = "placed";
    await order.save();
  }
};

export const createCheckoutSession = async (
  userId: string,
  checkoutSessionRequest: CheckoutSessionRequest
) => {
  const laundry = await Laundry.findById(checkoutSessionRequest.laundryId);

  if (!laundry) {
    throw new Error("Laundry not found");
  }

  const paymentMethod = checkoutSessionRequest.paymentMethod || "payLater";

  if (paymentMethod === "quota") {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.isMember || !user.memberExpiresAt || new Date() > user.memberExpiresAt) {
      throw new Error("Membership is invalid or expired");
    }
  }

  const newOrder = new Order({
    laundry: laundry,
    user: userId,
    status: "placed" as "placed" | "paid" | "inProgress" | "outForDelivery" | "delivered",
    deliveryDetails: checkoutSessionRequest.deliveryDetails,
    cartItems: checkoutSessionRequest.cartItems,
    paymentMethod: paymentMethod,
    weight: 0,
    isWeighed: false,
    totalAmount: 0, // initially 0 before weighing
    createdAt: new Date(),
  });

  await newOrder.save();

  // Return url as null since payment is deferred until weighing is completed
  return {
    url: null,
    orderId: newOrder._id.toString(),
  };
};

const createItemDetails = (
  checkoutSessionRequest: CheckoutSessionRequest,
  services: ServiceType[],
  deliveryPrice: number
) => {
  const itemDetails = checkoutSessionRequest.cartItems.map((cartItem) => {
    const service = services.find(
      (item) => item._id.toString() === cartItem.serviceId.toString()
    );

    if (!service) {
      throw new Error(`Service not found: ${cartItem.serviceId}`);
    }

    return {
      id: service._id.toString(),
      price: service.price, // Should be in Rupiah (integer)
      quantity: parseInt(cartItem.quantity),
      name: service.name.substring(0, 50),
    };
  });

  if (deliveryPrice > 0) {
    itemDetails.push({
      id: "DELIVERY",
      price: deliveryPrice,
      quantity: 1,
      name: "Delivery Fee",
    });
  }

  return itemDetails;
};

export const weighOrder = async (orderId: string, weight: number) => {
  const order = await Order.findById(orderId).populate("user").populate("laundry");
  if (!order) {
    throw new Error("Order not found");
  }

  order.weight = weight;
  order.isWeighed = true;

  const user: any = order.user;
  const laundry: any = order.laundry;

  let servicePrice = 9000; // default backup price per kg
  if (order.cartItems && order.cartItems.length > 0) {
    const serviceId = order.cartItems[0].serviceId;
    const service = laundry.services.find((s: any) => s._id.toString() === serviceId.toString());
    if (service) {
      servicePrice = service.price;
    }
  }

  const deliveryPrice = laundry.deliveryPrice || 0;

  if (order.paymentMethod === "quota") {
    if (user.isMember && user.quotaRemaining >= weight) {
      user.quotaRemaining -= weight;
      await user.save();

      order.totalAmount = 0; // paid completely via quota
      order.status = "paid";
      order.adminFee = 0;
      order.partnerRevenue = weight * 5000; // partner paid flat rate per kg
      await order.save();
    } else {
      const excessWeight = weight - (user.quotaRemaining || 0);
      user.quotaRemaining = 0;
      await user.save();

      const excessAmount = (excessWeight * servicePrice) + deliveryPrice;
      order.totalAmount = excessAmount;
      // Still placed (waiting for payment of excess amount)
      order.status = "placed"; 
      await order.save();
    }
  } else {
    // Regular payLater
    const totalAmount = (weight * servicePrice) + deliveryPrice;
    order.totalAmount = totalAmount;
    order.status = "placed"; // needs payment
    await order.save();
  }

  return order;
};

export const createPaymentForChargedOrder = async (userId: string, orderId: string) => {
  const order = await Order.findById(orderId).populate("laundry");
  if (!order) {
    throw new Error("Order not found");
  }
  if (!order.user || order.user.toString() !== userId) {
    throw new Error("Unauthorized");
  }
  if (order.status === "paid") {
    throw new Error("Order is already paid");
  }
  if (!order.totalAmount || order.totalAmount <= 0) {
    throw new Error("Order does not have a pending charge");
  }

  const parameter = {
    transaction_details: {
      order_id: order._id.toString(),
      gross_amount: order.totalAmount,
    },
    customer_details: {
      first_name: order.deliveryDetails?.name || "Pelanggan",
      email: order.deliveryDetails?.email || "",
      billing_address: {
        address: order.deliveryDetails?.addressLine1 || "",
        city: order.deliveryDetails?.city || "",
      }
    },
  };

  const url = MIDTRANS_IS_PRODUCTION
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const backendUrl = process.env.BACKEND_URL || "https://your-domain.com";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`,
      "X-Override-Notification": `${backendUrl}/api/order/checkout/webhook`,
    },
    body: JSON.stringify(parameter),
  });

  const transaction = await response.json();
  
  if (!response.ok) {
    throw new Error(transaction.error_messages?.[0] || "Failed to create Midtrans transaction");
  }

  return transaction.redirect_url;
};

export const createMembershipSubscription = async (userId: string, planType: string) => {
  const price = planType === "premium" ? 840000 : 560000;
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // order_id pattern: sub-[userId]-[planType]-[uniqueString]
  const uniqueId = crypto.randomBytes(4).toString("hex");
  const orderId = `sub-${userId}-${planType}-${uniqueId}`;

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: price,
    },
    customer_details: {
      first_name: user.name || "User",
      email: user.email,
    },
    item_details: [
      {
        id: `SUB-${planType.toUpperCase()}`,
        price: price,
        quantity: 1,
        name: `E-Laundry ${planType === "premium" ? "Premium" : "Regular"} Member Subscription`,
      }
    ],
  };

  const url = MIDTRANS_IS_PRODUCTION
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const backendUrl = process.env.BACKEND_URL || "https://your-domain.com";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`,
      "X-Override-Notification": `${backendUrl}/api/order/checkout/webhook`,
    },
    body: JSON.stringify(parameter),
  });

  const transaction = await response.json();

  if (!response.ok) {
    throw new Error(transaction.error_messages?.[0] || "Failed to create Midtrans transaction for membership");
  }

  return transaction.redirect_url;
};
