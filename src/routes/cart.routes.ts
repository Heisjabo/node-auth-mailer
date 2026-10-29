import { Router } from "express";
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from "../controllers/cart.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

// Every cart belongs to a logged-in user
router.use(authenticate);

router.get("/", getCart);
router.post("/items", addToCart);
router.patch("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.delete("/", clearCart);

export default router;
