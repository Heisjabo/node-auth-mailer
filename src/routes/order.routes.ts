import { Router } from "express";
import { checkout, getMyOrders, getMyOrderById } from "../controllers/order.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.use(authenticate);

router.post("/checkout", checkout);
router.get("/", getMyOrders);
router.get("/:id", getMyOrderById);

export default router;
