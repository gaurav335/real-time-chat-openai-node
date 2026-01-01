import { Server } from "socket.io";
import { getAnswerFromTextFromStrem } from "./services/chat.service.js";
import { finalizeAudio, handleChunk } from "./utils/audio.utils.js";
import { sessions } from "./sessionStore.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("question", async (msg) => {
      const randomUid = Math.random().toString(36).substring(2, 32);
      await getAnswerFromTextFromStrem(msg?.text, socket, randomUid);
    });
    socket.session = {
      responses: new Map(),
    };
    socket.on("audio-chunk-with-voice", async (data) => {
      console.log("AUDIO RECIVER");
      const { responseId, chunk } = data;
      handleChunk(socket, responseId, chunk, true);
    });
    socket.on("audio-end-with-voice", async (data) => {
      console.log("AUDIO END RECIVER");
      const { responseId } = data;
      await finalizeAudio(socket, responseId, true);
    });
    socket.on("audio-chunk-with-text", async (data) => {
      console.log("AUDIO RECIVER TEXT");
      handleChunk(socket, data?.chunk, false);
    });
    socket.on("audio-end-with-text", async () => {
      console.log("AUDIO END RECIVER TEXT");
      await finalizeAudio(socket, false);
    });

    socket.on("disconnect", () => {
      sessions.delete(socket.id);
      console.log("Socket disconnected:", socket.id);
    });
  });
};

export const getSocketById = (socketId) => {
  return io?.sockets?.sockets.get(socketId);
};
