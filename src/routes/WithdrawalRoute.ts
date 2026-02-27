import express from "express";
import WithdrawalController from "../controllers/WithdrawalController";
import { jwtCheck } from "../middleware/auth";

const router = express.Router();

// PARTNER (Must be logged in)
router.post("/request", jwtCheck, WithdrawalController.requestWithdrawal as any);
router.get("/my", jwtCheck, WithdrawalController.getMyWithdrawals as any);

// ADMIN
router.get("/all", jwtCheck, WithdrawalController.getAllWithdrawals as any);
router.patch("/:id/status", jwtCheck, WithdrawalController.updateWithdrawalStatus as any);

export default router;
