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
    const url = await OrderService.createCheckoutSession(req.userId, checkoutSessionRequest);
    return sendSuccess(res, { url }, "Checkout session created successfully");
  } catch (error: any) {
    console.log(error);
    
    if (error.message === "Laundry not found") {
      return sendError(res, error.message, 404);
    }
    
    const errorMessage = error.message;
    return sendError(res, errorMessage, 500);
  }
};

export default {
  getMyOrders,
  createCheckoutSession,
  midtransWebhookHandler,
};
