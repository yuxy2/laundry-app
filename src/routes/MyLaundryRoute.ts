import express from "express";
import multer from "multer";
import MyLaundryController from "../controllers/MyLaundryController";
import { jwtCheck, jwtParse } from "../middleware/auth";
import { validateMyLaundryRequest } from "../middleware/validation";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, //5mb
  },
});

router.get(
  "/order",
  jwtCheck,
  jwtParse,
  MyLaundryController.getMyLaundryOrders
);

router.patch(
  "/order/:orderId/status",
  jwtCheck,
  jwtParse,
  MyLaundryController.updateOrderStatus
);

router.get("/", jwtCheck, jwtParse, MyLaundryController.getMyLaundry);

router.post(
  "/",
  upload.single("imageFile"),
  validateMyLaundryRequest,
  jwtCheck,
  jwtParse,
  MyLaundryController.createMyLaundry
);

router.put(
  "/",
  upload.single("imageFile"),
  validateMyLaundryRequest,
  jwtCheck,
  jwtParse,
  MyLaundryController.updateMyLaundry
);

export default router;
