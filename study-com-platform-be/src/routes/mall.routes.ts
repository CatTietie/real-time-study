import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as mallController from "../controllers/mall.controller";

const router = Router();

router.get("/products", authMiddleware, mallController.getProducts);
router.get("/products/hot", mallController.getHotProducts);
router.get("/products/:id", authMiddleware, mallController.getProductDetail);
router.get("/banners", mallController.getBanners);
router.post("/exchange", authMiddleware, mallController.exchangeProduct);
router.get("/orders", authMiddleware, mallController.getMyOrders);
router.get("/decorations", authMiddleware, mallController.getMyDecorations);
router.post("/decorations/:id/equip", authMiddleware, mallController.equipDecoration);
router.post("/decorations/:id/unequip", authMiddleware, mallController.unequipDecoration);

export default router;
