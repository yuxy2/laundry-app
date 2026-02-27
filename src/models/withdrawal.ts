import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "completed"],
    default: "pending",
  },
  bankDetails: {
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
  },
  adminNotes: { type: String }, // optional notes if rejected
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
});

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
export default Withdrawal;
