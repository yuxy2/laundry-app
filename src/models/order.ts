import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  laundry: { type: mongoose.Schema.Types.ObjectId, ref: "Laundry" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deliveryDetails: {
    email: { type: String, required: true },
    name: { type: String, required: true },
    addressLine1: { type: String, required: true },
    city: { type: String, required: true },
  },
  cartItems: [
    {
      serviceId: { type: String, required: true },
      quantity: { type: Number, required: true },
      name: { type: String, required: true },
    },
  ],
  totalAmount: Number,
  status: {
    type: String,
    enum: ["placed", "paid", "inProgress", "outForDelivery", "delivered"],
  },
  adminFee: { type: Number, default: 0 },
  partnerRevenue: { type: Number, default: 0 },
  isBalancePaid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
