import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/responseWrapper";
import * as MyLaundryService from "../services/MyLaundryService";

const getMyLaundry = async (req: Request, res: Response) => {
  try {
    const laundry = await MyLaundryService.getLaundryByUserId(req.userId);
    if (!laundry) {
      return sendError(res, "Laundry not found", 404);
    }
    return sendSuccess(res, laundry, "Laundry retrieved successfully");
  } catch (error) {
    console.log("error fetching laundry:", error);
    return sendError(res, "Error fetching laundry", 500);
  }
};

const createMyLaundry = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File;
    if (!file) {
      return sendError(res, "Image file is required", 400);
    }

    const laundry = await MyLaundryService.createLaundry(
      req.userId,
      req.body,
      file,
    );

    return sendSuccess(res, laundry, "Laundry created successfully", 201);
  } catch (error: any) {
    console.log("error creating laundry:", error.message);
    if (error.message === "User laundry already exists") {
      return sendError(res, error.message, 409);
    }
    return sendError(res, "Something went wrong", 500);
  }
};

const updateMyLaundry = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File;
    const laundry = await MyLaundryService.updateLaundry(
      req.userId,
      req.body,
      file,
    );

    return sendSuccess(res, laundry, "Laundry updated successfully", 200);
  } catch (error: any) {
    console.log("error updating laundry:", error.message);
    if (error.message === "Laundry not found") {
      return sendError(res, error.message, 404);
    }
    return sendError(res, "Something went wrong", 500);
  }
};

const getMyLaundryOrders = async (req: Request, res: Response) => {
  try {
    const orders = await MyLaundryService.getLaundryOrders(req.userId);
    return sendSuccess(res, orders, "Orders retrieved successfully");
  } catch (error: any) {
    console.log("error fetching laundry orders:", error.message);
    if (error.message === "Laundry not found") {
      return sendError(res, error.message, 404);
    }
    return sendError(res, "Something went wrong", 500);
  }
};

const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await MyLaundryService.updateOrderDeliveryStatus(
      req.userId,
      orderId,
      status,
    );

    return sendSuccess(res, order, "Order status updated successfully", 200);
  } catch (error: any) {
    console.log("error updating order status: ", error.message);
    if (error.message === "Order not found") {
      return sendError(res, error.message, 404);
    }
    if (error.message === "Unauthorized to access this order") {
      return sendError(res, error.message, 401);
    }
    return sendError(res, "Unable to update order status", 500);
  }
};

export default {
  updateOrderStatus,
  getMyLaundryOrders,
  getMyLaundry,
  createMyLaundry,
  updateMyLaundry,
};
