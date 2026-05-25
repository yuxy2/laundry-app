import { Request, Response } from "express";
import * as OrderService from "../services/OrderService";
import { sendSuccess, sendError } from "../utils/responseWrapper";

const getMyOrders = async (req: Request, res: Response) => {
  try {
    const orders = await OrderService.getOrdersByUserId(req.userId);
    return sendSuccess(res, orders, "Orders retrieved successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "Something went wrong", 500);
  }
};

const midtransWebhookHandler = async (req: Request, res: Response) => {
  try {
    await OrderService.processMidtransWebhook(req.body);
    
    // Midtrans expects a plain 200 without JSON response wrap for webhook acknowledgment
    res.status(200).send("OK");
  } catch (error: any) {
    console.log(error);
    res.status(400).send(`Webhook error: ${error.message}`);
  }
};

const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const checkoutSessionRequest = req.body;
    const result = await OrderService.createCheckoutSession(req.userId, checkoutSessionRequest);
    return sendSuccess(res, result, "Checkout session created successfully");
  } catch (error: any) {
    console.log(error);
    
    if (error.message === "Laundry not found") {
      return sendError(res, error.message, 404);
    }
    
    const errorMessage = error.message;
    return sendError(res, errorMessage, 500);
  }
};

const createMembershipSubscription = async (req: Request, res: Response) => {
  try {
    const { planType } = req.body;
    if (!planType || (planType !== "regular" && planType !== "premium")) {
      return sendError(res, "Invalid plan type", 400);
    }
    const url = await OrderService.createMembershipSubscription(req.userId, planType);
    return sendSuccess(res, { url }, "Membership subscription checkout URL created successfully");
  } catch (error: any) {
    console.log(error);
    return sendError(res, error.message, 500);
  }
};

const weighOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { weight } = req.body;
    if (weight === undefined || isNaN(Number(weight)) || Number(weight) < 0) {
      return sendError(res, "Invalid weight value", 400);
    }
    const order = await OrderService.weighOrder(orderId, Number(weight));
    return sendSuccess(res, order, "Order weighed successfully");
  } catch (error: any) {
    console.log(error);
    return sendError(res, error.message, 500);
  }
};

const payChargedOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const url = await OrderService.createPaymentForChargedOrder(req.userId, orderId);
    return sendSuccess(res, { url }, "Payment URL generated successfully");
  } catch (error: any) {
    console.log(error);
    return sendError(res, error.message, 500);
  }
};

export default {
  getMyOrders,
  createCheckoutSession,
  midtransWebhookHandler,
  createMembershipSubscription,
  weighOrder,
  payChargedOrder,
};
