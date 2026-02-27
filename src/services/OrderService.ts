import Laundry, { ServiceType } from "../models/laundry";
import Order from "../models/order";
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

  if (transaction_status == "capture" || transaction_status == "settlement") {
    if (fraud_status == "accept" || !fraud_status) {
      const order = await Order.findById(order_id);

      if (!order) {
        throw new Error("Order not found");
      }

      order.totalAmount = parseFloat(gross_amount);
      
      // Hitung komisi (Misal Admin memotong 10%)
      const adminFee = order.totalAmount * 0.1;
      const partnerRevenue = order.totalAmount - adminFee;

      order.adminFee = adminFee;
      order.partnerRevenue = partnerRevenue;
      
      order.status = "paid" as "placed" | "paid" | "inProgress" | "outForDelivery" | "delivered";
      await order.save();
    }
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

  const newOrder = new Order({
    laundry: laundry,
    user: userId,
    status: "placed" as "placed" | "paid" | "inProgress" | "outForDelivery" | "delivered",
    deliveryDetails: checkoutSessionRequest.deliveryDetails,
    cartItems: checkoutSessionRequest.cartItems,
    createdAt: new Date(),
  });

  const itemDetails = createItemDetails(checkoutSessionRequest, laundry.services, laundry.deliveryPrice);

  const grossAmount = itemDetails.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const parameter = {
    transaction_details: {
      order_id: newOrder._id.toString(),
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: checkoutSessionRequest.deliveryDetails.name,
      email: checkoutSessionRequest.deliveryDetails.email,
      billing_address: {
        address: checkoutSessionRequest.deliveryDetails.addressLine1,
        city: checkoutSessionRequest.deliveryDetails.city,
      }
    },
    item_details: itemDetails,
  };

  const transaction = await snap.createTransaction(parameter);

  await newOrder.save();
  return transaction.redirect_url;
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
