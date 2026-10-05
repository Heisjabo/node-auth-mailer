import { Router } from "express";
import { register, login, profile, forgotPassword, resetPassword } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticate, profile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
