import { Request, Response } from "express";
import User from "../models/user";
import Laundry from "../models/laundry";
import Order from "../models/order";
import { sendSuccess, sendError } from "../utils/responseWrapper";

const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({});
    return sendSuccess(res, users, "Users fetched successfully");
  } catch (error) {
    console.log("error", error);
    return sendError(res, "Error fetching users", 500, error);
  }
};

const getAllLaundries = async (req: Request, res: Response) => {
  try {
    const laundries = await Laundry.find({}).populate("user", "name email");
    return sendSuccess(res, laundries, "Laundries fetched successfully");
  } catch (error) {
    console.log("error", error);
    return sendError(res, "Error fetching laundries", 500, error);
  }
};

const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalLaundries = await Laundry.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    // Aggregation for total revenue from placed/paid/delivered orders
    const revenueStats = await Order.aggregate([
      { $match: { status: { $in: ["paid", "inProgress", "outForDelivery", "delivered"] } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;

    return sendSuccess(res, {
      totalUsers,
      totalLaundries,
      totalOrders,
      totalRevenue
    }, "Dashboard statistics fetched successfully");
  } catch (error) {
    console.log("error", error);
    return sendError(res, "Error fetching stats", 500, error);
  }
};

export default {
  getAllUsers,
  getAllLaundries,
  getDashboardStats
};
