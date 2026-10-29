import { Router } from "express";
import { verifyPayment } from "../controllers/payment.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.get("/verify", authenticate, verifyPayment);

export default router;
