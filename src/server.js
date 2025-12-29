import express from "express";
import http from "http";
import dotenv from "dotenv";
import { initSocket } from "./socket.js";
import audioRoutes from "./routes/audio.routes.js";
import chatRoutes from "./routes/chat.routes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use("/api/audio", audioRoutes);
app.use("/api/chat", chatRoutes);

initSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});