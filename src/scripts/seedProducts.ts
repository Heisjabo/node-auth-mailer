import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../models/product.model";
import { products } from "../data/products";

// Usage: npm run seed
// Deletes every product, then inserts the list from src/data/products.ts.
const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);

  await Product.deleteMany({});
  const created = await Product.insertMany(products);
  console.log(`Seeded ${created.length} products`);

  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
