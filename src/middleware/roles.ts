import { Request, Response, NextFunction } from "express";

// Middleware to ensure only users with the 'admin' role can access the route
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

// Middleware to ensure only partners (or admins) can access the route
export const requirePartner = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.role !== "partner" && req.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Partners only" });
  }
  next();
};
