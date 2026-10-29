import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Product } from "../models/product.model";

export const getAllProducts = async (req: Request, res: Response) => {
  const products = await Product.find().sort({ createdAt: 1 });
  res.json({ products });
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ product });
};
