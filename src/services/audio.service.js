import fs from "fs";
import path from "path";
import { convertToWav, splitPCMChunks } from "../utils/audio.utils.js";
import { translatePCMBuffer, translateText } from "./openai.service.js";
import { getAnswerFromText, getAnswerFromTextToAudio } from "./chat.service.js";

export const processAudioAndTranslate = async (
  audioBuffer,
  socket,
  targetLanguage
) => {
  const tempDir = "./temp";
  fs.mkdirSync(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, `input-${Date.now()}`);
  const wavPath = `${inputPath}.wav`;

  fs.writeFileSync(inputPath, audioBuffer);
  await convertToWav(inputPath, wavPath);

  const wavBuffer = fs.readFileSync(wavPath);
  const pcmChunks = splitPCMChunks(wavBuffer);

  let accumulator = [];
  let accumulatedBytes = 0;
  const TARGET_BYTES = 48000;

  for (const chunk of pcmChunks) {
    accumulator.push(chunk);
    accumulatedBytes += chunk.length;

    if (accumulatedBytes >= TARGET_BYTES) {
      const combinedPCM = Buffer.concat(accumulator);

      const text = await translatePCMBuffer(combinedPCM);
      // const translatedText = await translateText(text, targetLanguage);
      socket.emit("translation", {
        text,
        // translatedText,
        targetLanguage,
        partial: true,
      });

      accumulator = [];
      accumulatedBytes = 0;
    }
  }

  // leftover audio
  if (accumulator.length > 0) {
    const text = await translatePCMBuffer(Buffer.concat(accumulator));
    socket.emit("translation", { text, partial: true });
  }
  console.log({ sendMsgText });

  socket.emit("translation-complete");

  fs.rmSync(tempDir, { recursive: true, force: true });
};

export const processAudioAndTranslateSocket = async (
  audioBuffer,
  socket,
  randomUid
) => {
  const tempDir = "./temp";
  fs.mkdirSync(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, `input-${Date.now()}`);
  const wavPath = `${inputPath}.wav`;

  fs.writeFileSync(inputPath, audioBuffer);
  await convertToWav(inputPath, wavPath);

  const wavBuffer = fs.readFileSync(wavPath);
  const pcmChunks = splitPCMChunks(wavBuffer);

  let accumulator = [];
  let accumulatedBytes = 0;

  const TARGET_BYTES = 48000;

  for (const chunk of pcmChunks) {
    accumulator.push(chunk);
    accumulatedBytes += chunk.length;

    if (accumulatedBytes >= TARGET_BYTES) {
      const combinedPCM = Buffer.concat(accumulator);
      const text = await translatePCMBuffer(combinedPCM);
      socket.emit("audio-translation", {
        id: randomUid,
        role: "model",
        text: text,
        partial: true,
      });

      accumulator = [];
      accumulatedBytes = 0;
    }
  }
  if (accumulator.length > 0) {
    const text = await translatePCMBuffer(Buffer.concat(accumulator));
    const botMessageId = (Date.now() + 1).toString();
    socket.emit("audio-translation", {
      id: randomUid,
      role: "model",
      text: text,
      partial: true,
    });
  }
  socket.emit("audio-translation-complete");
  fs.rmSync(tempDir, { recursive: true, force: true });
};

export const processAudioAndTranslateSocketWithReturnAudio = async (
  audioBuffer,
  socket,
  randomUid
) => {
  const tempDir = "./temp";
  fs.mkdirSync(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, `input-${Date.now()}`);
  const wavPath = `${inputPath}.wav`;

  fs.writeFileSync(inputPath, audioBuffer);
  await convertToWav(inputPath, wavPath);

  const wavBuffer = fs.readFileSync(wavPath);
  const pcmChunks = splitPCMChunks(wavBuffer);

  let accumulator = [];
  let sendFullMessage = "";
  let accumulatedBytes = 0;

  const TARGET_BYTES = 48000;

  for (const chunk of pcmChunks) {
    accumulator.push(chunk);
    accumulatedBytes += chunk.length;

    if (accumulatedBytes >= TARGET_BYTES) {
      const combinedPCM = Buffer.concat(accumulator);
      const text = await translatePCMBuffer(combinedPCM);
      sendFullMessage += text + " ";
      // socket.emit("audio-translation", {
      //   id: randomUid,
      //   role: "model",
      //   text: text,
      //   partial: true,
      // });

      accumulator = [];
      accumulatedBytes = 0;
    }
  }
  if (accumulator.length > 0) {
    const text = await translatePCMBuffer(Buffer.concat(accumulator));
    sendFullMessage += text + " ";
    // socket.emit("audio-translation", {
    //   id: randomUid,
    //   role: "model",
    //   text: text,
    //   partial: true,
    // });
  }
  await getAnswerFromTextToAudio(sendFullMessage, socket, randomUid);

  // socket.emit("audio-translation-complete");
  fs.rmSync(tempDir, { recursive: true, force: true });
};

export const base64ToBufferFileSave = async (base64) => {
  const audioBuffer = Buffer.from(base64, "base64");
  const tempDir = "./temp";
  fs.mkdirSync(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, `input-${Date.now()}`);
  const wavPath = `${inputPath}.wav`;

  fs.writeFileSync(inputPath, audioBuffer);
  await convertToWav(inputPath, wavPath);

  const wavBuffer = fs.readFileSync(wavPath);
  const pcmChunks = splitPCMChunks(wavBuffer);

  let accumulator = [];
  let accumulatedBytes = 0;
  const TARGET_BYTES = 48000;

  for (const chunk of pcmChunks) {
    accumulator.push(chunk);
    accumulatedBytes += chunk.length;

    if (accumulatedBytes >= TARGET_BYTES) {
      const combinedPCM = Buffer.concat(accumulator);

      const text = await translatePCMBuffer(combinedPCM);
      accumulator = [];
      accumulatedBytes = 0;
      return text;
    }
  }
  if (accumulator.length > 0) {
    const text = await translatePCMBuffer(Buffer.concat(accumulator));
    return text;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
};
