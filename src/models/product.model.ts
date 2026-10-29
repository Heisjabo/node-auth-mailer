import { Schema, model } from "mongoose";

export interface IProduct {
  name: string;
  category: string;
  price: number; // in RWF, whole francs
  rating: number;
  stock: number;
  image: string;
  description: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    stock: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  // virtuals: true adds an "id" field to the JSON, so the frontend can use product.id
  { timestamps: true, toJSON: { virtuals: true } }
);

export const Product = model<IProduct>("Product", productSchema);
