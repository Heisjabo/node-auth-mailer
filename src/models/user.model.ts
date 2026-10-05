import { Schema, model } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  resetCode?: string;
  resetCodeExpires?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    resetCode: { type: String, select: false },
    resetCodeExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
