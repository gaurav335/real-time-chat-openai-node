import express from "express";
import { chatWithText } from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/", chatWithText);

export default router;
