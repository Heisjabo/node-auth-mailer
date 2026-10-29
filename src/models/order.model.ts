import { Schema, model, Types } from "mongoose";

export type PaymentMethod = "card" | "mobilemoney";
export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

// A snapshot of what was bought. Name and price are copied in at checkout,
// so the order stays correct even if the product changes later.
export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface IOrder {
  user: Types.ObjectId;
  items: IOrderItem[];
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  txRef: string; // our own reference, sent to Flutterwave to link the payment to this order
  flwTransactionId?: number; // Flutterwave's id for the payment, saved once it is verified
  paidAt?: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        image: { type: String, default: "" },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    total: { type: Number, required: true },
    currency: { type: String, required: true },
    paymentMethod: { type: String, enum: ["card", "mobilemoney"], required: true },
    status: { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending" },
    txRef: { type: String, required: true, unique: true },
    flwTransactionId: { type: Number },
    paidAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

export const Order = model<IOrder>("Order", orderSchema);
