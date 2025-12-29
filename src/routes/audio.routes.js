import express from "express";
import multer from "multer";
import { uploadAudio } from "../controllers/audio.controller.js";

const router = express.Router();
const upload = multer();

router.post("/upload", upload.single("audio"), uploadAudio);

export default router;
