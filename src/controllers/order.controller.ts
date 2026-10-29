import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import crypto from "crypto";
import { Cart } from "../models/cart.model";
import { Order } from "../models/order.model";
import { createPaymentLink, CURRENCY, MAX_CHARGE, PAYMENT_OPTIONS, PaymentMethod } from "../services/flutterwave.service";

// Body: { paymentMethod: "card" | "mobilemoney", phoneNumber? }
// Turns the cart into a pending order and returns the Flutterwave link to pay it.
// The cart is only emptied once the payment is verified (see payment.controller.ts).
export const checkout = async (req: Request, res: Response) => {
  const { paymentMethod, phoneNumber } = req.body;
  const user = req.user!;

  if (!Object.keys(PAYMENT_OPTIONS).includes(paymentMethod)) {
    return res.status(400).json({ message: "paymentMethod must be card or mobilemoney" });
  }
  if (paymentMethod === "mobilemoney" && !phoneNumber) {
    return res.status(400).json({ message: "phoneNumber is required for mobile money" });
  }

  const cart = await Cart.findOne({ user: user._id }).populate("items.product");
  const cartItems = (cart?.items ?? []).filter((item: any) => item.product);

  if (cartItems.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  for (const item of cartItems as any[]) {
    if (item.quantity > item.product.stock) {
      return res.status(400).json({ message: `Only ${item.product.stock} ${item.product.name} left in stock` });
    }
  }

  // Prices come from the database, never from the request body,
  // otherwise a user could send { price: 1 } and pay almost nothing.
  const items = (cartItems as any[]).map((item) => ({
    product: item.product._id,
    name: item.product.name,
    image: item.product.image,
    price: item.product.price,
    quantity: item.quantity,
  }));
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (total > MAX_CHARGE) {
    return res.status(400).json({
      message: `Order total must not exceed RWF ${MAX_CHARGE.toLocaleString("en-US")}. Remove some items from your cart.`,
    });
  }

  const order = await Order.create({
    user: user._id,
    items,
    total,
    currency: CURRENCY,
    paymentMethod,
    // tx_ref must be unique for every payment attempt
    txRef: `shopease-${crypto.randomUUID()}`,
  });

  try {
    const paymentLink = await createPaymentLink({
      txRef: order.txRef,
      amount: order.total,
      paymentMethod: paymentMethod as PaymentMethod,
      customer: { email: user.email, name: user.name, phoneNumber },
    });

    res.status(201).json({ order, paymentLink });
  } catch (error: any) {
    console.error("Could not create Flutterwave payment:", error.message);
    order.status = "failed";
    await order.save();
    res.status(502).json({ message: "Could not start the payment, try again later" });
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  const orders = await Order.find({ user: req.user!._id }).sort({ createdAt: -1 });
  res.json({ orders });
};

export const getMyOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  // Filtering by user too means nobody can read someone else's order
  const order = await Order.findOne({ _id: id, user: req.user!._id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json({ order });
};
