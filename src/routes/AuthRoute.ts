import express from "express";
import AuthController from "../controllers/AuthController";

const router = express.Router();

router.post("/register", AuthController.register as any);
router.post("/login", AuthController.login as any);

export default router;
