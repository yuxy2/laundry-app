import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

const handleValidationErrors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const validateMyUserRequest = [
  body("name").isString().notEmpty().withMessage("Name must be a string"),
  body("addressLine1")
    .isString()
    .notEmpty()
    .withMessage("AddressLine1 must be a string"),
  body("city").isString().notEmpty().withMessage("City must be a string"),
  body("country").isString().notEmpty().withMessage("Country must be a string"),
  handleValidationErrors,
];

export const validateMyLaundryRequest = [
  body("laundryName").notEmpty().withMessage("Laundry name is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("country").notEmpty().withMessage("Country is required"),
  body("deliveryPrice")
    .isFloat({ min: 0 })
    .withMessage("Delivery price must be a positive number"),
  body("estimatedDeliveryTime")
    .isInt({ min: 0 })
    .withMessage("Estimated delivery time must be a postivie integar"),
  body("facilities")
    .isArray()
    .withMessage("Facilities must be an array")
    .not()
    .isEmpty()
    .withMessage("Facilities array cannot be empty"),
  body("services").isArray().withMessage("Services must be an array"),
  body("services.*.name").notEmpty().withMessage("Service name is required"),
  body("services.*.price")
    .isFloat({ min: 0 })
    .withMessage("Service price is required and must be a postive number"),
  handleValidationErrors,
];
