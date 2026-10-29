import { Router } from "express";
import { getAllProducts, getProductById } from "../controllers/product.controller";

const router = Router();

// Public: anyone can browse the shop
router.get("/", getAllProducts);
router.get("/:id", getProductById);

export default router;
