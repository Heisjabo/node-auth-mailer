import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { User } from "../models/user.model";

const ROLES = ["user", "admin"];

const toPublicUser = (user: InstanceType<typeof User>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const getAllUsers = async (req: Request, res: Response) => {
  // Defaults so /api/users works without query params
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  res.json({ page, limit, total, count: users.length, users: users.map(toPublicUser) });
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ user: toPublicUser(user) });
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  // Unlike register, an admin may choose the role
  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ message: "Role must be user or admin" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role,
  });

  res.status(201).json({ user: toPublicUser(user) });
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, password, role } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  if (name === undefined && email === undefined && password === undefined && role === undefined) {
    return res.status(400).json({ message: "Provide at least one of name, email, password or role" });
  }

  if (role !== undefined && !ROLES.includes(role)) {
    return res.status(400).json({ message: "Role must be user or admin" });
  }

  if (password !== undefined && String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (email !== undefined && email.toLowerCase() !== user.email) {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already in use" });
    }
    user.email = email;
  }

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (password !== undefined) user.password = await bcrypt.hash(String(password), 10);

  await user.save();

  res.json({ user: toPublicUser(user) });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  // Stops an admin from locking themselves out by accident
  if (req.user?.id === id) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "User deleted", user: toPublicUser(user) });
};
