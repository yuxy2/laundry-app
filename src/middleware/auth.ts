
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      role: string;
    }
  }
}

export const jwtCheck = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = authorization.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    req.userId = decoded.userId;
    req.role = decoded.role || "user";
    
    // Check if user still exists in database
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const jwtParse = (req: Request, res: Response, next: NextFunction) => {
  // Disimpan sebagai passthrough middleware agar tidak error pada rute yang sebelumnya
  // bergantung pada chain jwtCheck -> jwtParse
  next();
};
