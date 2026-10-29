import { Request, Response } from "express";
import { isValidObjectId, Types } from "mongoose";
import { Cart } from "../models/cart.model";
import { Product } from "../models/product.model";

// Loads the user's cart with full product details, creating an empty one the first time
const findOrCreateCart = async (userId: Types.ObjectId) => {
  let cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// Shape sent to the frontend: { items: [{ product, quantity }], total }
// Items whose product was deleted from the shop are skipped.
const cartResponse = (cart: Awaited<ReturnType<typeof findOrCreateCart>>) => {
  const items = cart.items
    .filter((item: any) => item.product)
    .map((item: any) => ({ product: item.product, quantity: item.quantity }));

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return { items, total };
};

export const getCart = async (req: Request, res: Response) => {
  const cart = await findOrCreateCart(req.user!._id);
  res.json({ cart: cartResponse(cart) });
};

// Body: { productId, quantity } (quantity defaults to 1). Adds on top of what is already in the cart.
export const addToCart = async (req: Request, res: Response) => {
  const { productId } = req.body;
  const quantity = Number(req.body.quantity ?? 1);

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Quantity must be a whole number of at least 1" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const cart = await findOrCreateCart(req.user!._id);
  const existing = cart.items.find((item: any) => item.product?._id.equals(product._id));
  const newQuantity = (existing?.quantity ?? 0) + quantity;

  if (newQuantity > product.stock) {
    return res.status(400).json({ message: `Only ${product.stock} left in stock` });
  }

  if (existing) {
    existing.quantity = newQuantity;
  } else {
    cart.items.push({ product: product._id, quantity });
  }

  await cart.save();
  await cart.populate("items.product");

  res.status(201).json({ cart: cartResponse(cart) });
};

// Body: { quantity }. Sets the quantity exactly; 0 removes the item.
export const updateCartItem = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ message: "Quantity must be a whole number of 0 or more" });
  }

  const cart = await findOrCreateCart(req.user!._id);
  const item = cart.items.find((item: any) => item.product?._id.toString() === productId);

  if (!item) {
    return res.status(404).json({ message: "Product is not in your cart" });
  }

  if (quantity === 0) {
    cart.items = cart.items.filter((i) => i !== item);
  } else {
    const stock = (item.product as any).stock;
    if (quantity > stock) {
      return res.status(400).json({ message: `Only ${stock} left in stock` });
    }
    item.quantity = quantity;
  }

  await cart.save();
  await cart.populate("items.product");

  res.json({ cart: cartResponse(cart) });
};

export const removeCartItem = async (req: Request, res: Response) => {
  const { productId } = req.params;

  const cart = await findOrCreateCart(req.user!._id);
  cart.items = cart.items.filter((item: any) => item.product?._id.toString() !== productId);
  await cart.save();

  res.json({ cart: cartResponse(cart) });
};

export const clearCart = async (req: Request, res: Response) => {
  const cart = await findOrCreateCart(req.user!._id);
  cart.items = [];
  await cart.save();

  res.json({ cart: cartResponse(cart) });
};
