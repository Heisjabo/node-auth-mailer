import { Router } from "express";
import { getAllUsers } from "../controllers/user.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

const router = Router();

// Admin only: must be logged in (authenticate) AND have the admin role (authorize)
router.get("/", authenticate, authorize("admin"), getAllUsers);

export default router;
