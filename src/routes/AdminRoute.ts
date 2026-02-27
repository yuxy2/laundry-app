import express from "express";
import AdminController from "../controllers/AdminController";
import { jwtCheck, jwtParse } from "../middleware/auth";
import { requireAdmin } from "../middleware/roles";

const router = express.Router();

// Semua API berjalan di bawah proteksi auth & filter akses role admin
router.use(jwtCheck, jwtParse, requireAdmin);

router.get("/users", AdminController.getAllUsers);
router.get("/laundries", AdminController.getAllLaundries);
router.get("/stats", AdminController.getDashboardStats);

export default router;
