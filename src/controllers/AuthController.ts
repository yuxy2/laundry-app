import { Request, Response } from "express";
import User from "../models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, adminSecret } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Menentukan Role User Baru (Default: partner)
    let assignedRole = role === "user" ? "user" : "partner"; 
    
    // Jika ada yang mencoba mendaftar sebagai Admin
    if (role === "admin") {
      // Cek apakah dia tahu rahasia adminnya
      if (adminSecret === process.env.ADMIN_SECRET) {
        assignedRole = "admin";
      } else {
        return res.status(403).json({ success: false, message: "Invalid Admin Secret Code!" });
      }
    }

    // Create new user
    user = new User({
      email,
      password: hashedPassword,
      name,
      role: assignedRole,
    });
    
    await user.save();

    // Generate JWT token
    const payload = {
      userId: user._id,
      role: user.role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ success: false, message: "Error registering user" });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const payload = {
      userId: user._id,
      role: user.role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Error logging in" });
  }
};

export default {
  register,
  login,
};
