import Laundry from "../models/laundry";
import Order from "../models/order";
import mongoose from "mongoose";
import cloudinary from "cloudinary";

export const uploadImage = async (file: Express.Multer.File) => {
  const image = file;
  const base64Image = image.buffer.toString("base64");
  const dataURI = `data:${image.mimetype};base64,${base64Image}`;

  const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);
  return uploadResponse.url;
};

export const getLaundryByUserId = async (userId: string) => {
  return await Laundry.findOne({ user: userId });
};

export const createLaundry = async (userId: string, body: any, file?: Express.Multer.File) => {
  const existingLaundry = await getLaundryByUserId(userId);

  if (existingLaundry) {
    throw new Error("User laundry already exists");
  }

  let { services, facilities, ...restBody } = body;
  
  if (typeof services === 'string') {
    try {
      services = JSON.parse(services);
    } catch(e) {}
  } else if (Array.isArray(services) && typeof services[0] === 'string') {
    services = services.map((s: string) => {
      try { return JSON.parse(s); } catch { return s; }
    });
  }

  if (typeof facilities === 'string') {
    try {
      facilities = JSON.parse(facilities);
    } catch(e) {}
  } else if (Array.isArray(facilities) && typeof facilities[0] === 'string') {
    facilities = facilities.map((f: string) => {
      try { return JSON.parse(f); } catch { return f; }
    });
  }

  const laundryToSave = new Laundry({
    ...restBody,
    services,
    facilities,
    user: new mongoose.Types.ObjectId(userId),
    lastUpdated: new Date()
  });

  if (body.latitude && body.longitude) {
    laundryToSave.location = {
      type: 'Point',
      coordinates: [parseFloat(body.longitude), parseFloat(body.latitude)]
    };
  }

  if (file) {
    const imageUrl = await uploadImage(file);
    laundryToSave.imageUrl = imageUrl;
  }

  await laundryToSave.save();
  return laundryToSave;
};

export const updateLaundry = async (userId: string, body: any, file?: Express.Multer.File) => {
  const laundry = await getLaundryByUserId(userId);

  if (!laundry) {
    throw new Error("Laundry not found");
  }

  let { services, facilities } = body;
  
  if (typeof services === 'string') {
    try {
      services = JSON.parse(services);
    } catch(e) {}
  } else if (Array.isArray(services) && typeof services[0] === 'string') {
    services = services.map((s: string) => {
      try { return JSON.parse(s); } catch { return s; }
    });
  }

  if (typeof facilities === 'string') {
    try {
      facilities = JSON.parse(facilities);
    } catch(e) {}
  } else if (Array.isArray(facilities) && typeof facilities[0] === 'string') {
    facilities = facilities.map((f: string) => {
      try { return JSON.parse(f); } catch { return f; }
    });
  }

  // Update fields
  laundry.laundryName = body.laundryName;
  laundry.city = body.city;
  laundry.country = body.country;
  laundry.deliveryPrice = body.deliveryPrice;
  laundry.estimatedDeliveryTime = body.estimatedDeliveryTime;
  laundry.facilities = facilities;
  laundry.services = services;
  laundry.lastUpdated = new Date();

  if (body.latitude && body.longitude) {
    laundry.location = {
      type: 'Point',
      coordinates: [parseFloat(body.longitude), parseFloat(body.latitude)]
    };
  }

  // Upload new image if provided
  if (file) {
    const imageUrl = await uploadImage(file);
    laundry.imageUrl = imageUrl;
  }

  await laundry.save();
  return laundry;
};

export const getLaundryOrders = async (userId: string) => {
  const laundry = await getLaundryByUserId(userId);
  if (!laundry) {
    throw new Error("Laundry not found");
  }

  const orders = await Order.find({ laundry: laundry._id })
    .populate("laundry")
    .populate("user");

  return orders;
};

export const updateOrderDeliveryStatus = async (userId: string, orderId: string, status: string) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const laundry = await Laundry.findById(order.laundry);

  // Ensure the user actually owns the laundry that this order belongs to
  if (laundry?.user?._id.toString() !== userId) {
    throw new Error("Unauthorized to access this order");
  }

  // Cast the updated status correctly
  order.status = status as "placed" | "paid" | "inProgress" | "outForDelivery" | "delivered";
  
  if (order.status === "delivered" && !order.isBalancePaid) {
    const partnerId = laundry.user;
    const User = require("../models/user").default;
    const partner = await User.findById(partnerId);
    
    if (partner && order.partnerRevenue > 0) {
      partner.balance = (partner.balance || 0) + order.partnerRevenue;
      await partner.save();
      
      order.isBalancePaid = true;
    }
  }

  await order.save();

  return order;
};
