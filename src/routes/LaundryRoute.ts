import express from "express";
import { param } from "express-validator";
import LaundryController from "../controllers/LaundryController";

const router = express.Router();

router.get(
  "/:laundryId",
  param("laundryId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("LaundryId paramenter must be a valid string"),
  LaundryController.getLaundry
);

router.get(
  "/search/:city",
  param("city")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("City paramenter must be a valid string"),
  LaundryController.searchLaundry
);

export default router;
