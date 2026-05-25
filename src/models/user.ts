import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
  },
  addressLine1: {
    type: String,
  },
  city: {
    type: String,
  },
  country: {
    type: String,
  },
  role: {
    type: String,
    enum: ["user", "partner", "admin"],
    default: "user",
  },
  balance: {
    type: Number,
    default: 0,
  },
  isMember: {
    type: Boolean,
    default: false,
  },
  memberType: {
    type: String,
    enum: ["none", "regular", "premium"],
    default: "none",
  },
  quotaRemaining: {
    type: Number,
    default: 0,
  },
  memberExpiresAt: {
    type: Date,
    default: null,
  },
});

const User = mongoose.model("User", userSchema);
export default User;
