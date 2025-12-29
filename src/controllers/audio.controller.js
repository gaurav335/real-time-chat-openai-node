import { getSocketById } from "../socket.js";
import { processAudioAndTranslate } from "../services/audio.service.js";

export const uploadAudio = async (req, res) => {
  try {
    const socketId = req.headers["socket-id"];
    const socket = getSocketById(socketId);
  const targetLanguage = req.headers["target-language"];

    if (!socket) {
      return res.status(400).json({ error: "Invalid socket ID" });
    }

    res.json({ status: "Audio received. Processing started." });

    await processAudioAndTranslate(req.file.buffer, socket,targetLanguage );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Audio processing failed" });
  }
};
