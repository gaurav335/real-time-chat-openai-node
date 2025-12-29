import { getAnswerFromText } from "../services/chat.service.js";
import { getSocketById } from "../socket.js";

export const chatWithText = async (req, res) => {
  try {
    const { question } = req.body;
    const socketId = req.headers["socket-id"];
    const socket = getSocketById(socketId);

    if (!socket) {
      return res.status(400).json({ error: "Invalid socket ID" });
    }
    if (!question || question.trim() === "") {
      return res.status(400).json({ error: "Question is required" });
    }

    const answer = await getAnswerFromText(question);
    socket.emit("answer", {
      answer,
    });

    res.json({ status: "Answer received. Processing started." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat failed." });
  }
};
