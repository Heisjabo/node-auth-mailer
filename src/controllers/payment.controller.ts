import { Request, Response } from "express";
import { Cart } from "../models/cart.model";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";
import { verifyTransaction } from "../services/flutterwave.service";

// GET /api/payments/verify?tx_ref=...&transaction_id=...&status=...
// The frontend calls this with the values Flutterwave put in the redirect URL.
export const verifyPayment = async (req: Request, res: Response) => {
  const txRef = String(req.query.tx_ref || "");
  const transactionId = String(req.query.transaction_id || "");
  const redirectStatus = String(req.query.status || "");

  if (!txRef) {
    return res.status(400).json({ message: "tx_ref is required" });
  }

  const order = await Order.findOne({ txRef, user: req.user!._id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // Already handled (e.g. the user refreshed the page): just return it
  if (order.status === "paid") {
    return res.json({ order });
  }

  // The user closed or cancelled the Flutterwave page, so there is nothing to verify
  if (redirectStatus === "cancelled" || !transactionId) {
    order.status = "cancelled";
    await order.save();
    return res.json({ order });
  }

  let transaction;
  try {
    transaction = await verifyTransaction(transactionId);
  } catch (error: any) {
    console.error("Could not verify Flutterwave payment:", error.message);
    return res.status(502).json({ message: "Could not verify the payment, try again later" });
  }

  // The 4 checks that make a payment trustworthy:
  // it succeeded, it is for THIS order, for the full amount, in the right currency.
  const isPaid =
    transaction.status === "successful" &&
    transaction.tx_ref === order.txRef &&
    transaction.amount >= order.total &&
    transaction.currency === order.currency;

  if (!isPaid) {
    order.status = "failed";
    await order.save();
    return res.json({ order });
  }

  // Only update the order if it is not paid yet. If two requests verify at the same
  // time (e.g. a double page load), only the first one gets the order back here,
  // so stock is taken out once.
  const paidOrder = await Order.findOneAndUpdate(
    { _id: order._id, status: { $ne: "paid" } },
    { status: "paid", flwTransactionId: transaction.id, paidAt: new Date() },
    { new: true }
  );

  if (!paidOrder) {
    return res.json({ order: await Order.findById(order._id) });
  }

  // Paid: take the items out of stock and empty the cart
  await Promise.all(
    paidOrder.items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } }))
  );
  await Cart.updateOne({ user: req.user!._id }, { $set: { items: [] } });

  res.json({ order: paidOrder });
};
