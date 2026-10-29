import { Schema, model, Types } from "mongoose";

// One cart per user. Each item only stores the product and how many.
// The price is NOT stored here: it is always read from the product, so it is never out of date.
export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
}

export interface ICart {
  user: Types.ObjectId;
  items: ICartItem[];
}

const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { timestamps: true }
);

export const Cart = model<ICart>("Cart", cartSchema);
