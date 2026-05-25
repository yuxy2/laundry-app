import express from "express";
import { jwtCheck, jwtParse } from "../middleware/auth";
import { requirePartner } from "../middleware/roles";
import OrderController from "../controllers/OrderController";

const router = express.Router();

router.get("/", jwtCheck, jwtParse, OrderController.getMyOrders);

router.post(
  "/checkout/create-checkout-session",
  jwtCheck,
  jwtParse,
  OrderController.createCheckoutSession
);

router.post("/checkout/webhook", OrderController.midtransWebhookHandler);

router.post(
  "/membership/subscribe",
  jwtCheck,
  jwtParse,
  OrderController.createMembershipSubscription
);

router.post(
  "/:orderId/weigh",
  jwtCheck,
  jwtParse,
  requirePartner,
  OrderController.weighOrder
);

router.post(
  "/:orderId/pay-charge",
  jwtCheck,
  jwtParse,
  OrderController.payChargedOrder
);

export default router;
