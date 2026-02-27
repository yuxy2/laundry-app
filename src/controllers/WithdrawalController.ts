import { Request, Response } from "express";
import Withdrawal from "../models/withdrawal";
import User from "../models/user";

// For Partner
const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { amount, bankName, accountNumber, accountName } = req.body;

    const partner = await User.findById(userId);

    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    if (!partner.balance || partner.balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Deduct the partner's balance first
    partner.balance -= amount;
    await partner.save();

    // Create a new withdrawal record
    const withdrawal = new Withdrawal({
      partner: userId,
      amount,
      bankDetails: {
        bankName,
        accountNumber,
        accountName,
      },
      status: "pending",
      createdAt: new Date(),
    });

    await withdrawal.save();

    return res.status(201).json({ success: true, message: "Withdrawal requested successfully", data: withdrawal });
  } catch (error) {
    console.error("Error requesting withdrawal: ", error);
    return res.status(500).json({ success: false, message: "Unable to process withdrawal" });
  }
};

const getMyWithdrawals = async (req: Request, res: Response) => {
  try {
    const withdrawals = await Withdrawal.find({ partner: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: withdrawals });
  } catch (error) {
    console.error("Error fetching withdrawals: ", error);
    return res.status(500).json({ success: false, message: "Unable to fetch withdrawals" });
  }
};

// For Admin
const getAllWithdrawals = async (req: Request, res: Response) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("partner", "name email balance")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: withdrawals });
  } catch (error) {
    console.error("Error fetching all withdrawals: ", error);
    return res.status(500).json({ success: false, message: "Unable to fetch withdrawals" });
  }
};

const updateWithdrawalStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ success: false, message: `Cannot update a withdrawal that is already ${withdrawal.status}` });
    }

    // If Admin REJECTS, refund the balance to the partner
    if (status === "rejected") {
      const partner = await User.findById(withdrawal.partner);
      if (partner) {
        partner.balance = (partner.balance || 0) + withdrawal.amount;
        await partner.save();
      }
    }

    withdrawal.status = status;
    withdrawal.adminNotes = adminNotes || "";
    withdrawal.processedAt = new Date();

    await withdrawal.save();

    return res.status(200).json({ success: true, message: "Withdrawal status updated", data: withdrawal });
  } catch (error) {
    console.error("Error updating withdrawal: ", error);
    return res.status(500).json({ success: false, message: "Unable to update withdrawal" });
  }
};

export default {
  requestWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  updateWithdrawalStatus,
};
