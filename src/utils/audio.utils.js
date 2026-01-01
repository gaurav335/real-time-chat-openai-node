import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { transcribeAndAnswer } from "../services/openai.service.js";
import fs from "fs";
import path from "path";
import { createWavBuffer } from "./wav.utils.js";
import OpenAI from "openai";
import { openaiConfig } from "../config/openai.config.js";
import { getAnswerFromTextFromStrem } from "../services/chat.service.js";

ffmpeg.setFfmpegPath(ffmpegPath);

export const convertToWav = (inputPath, outputPath) =>
  new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .format("wav")
      .save(outputPath)
      .on("end", resolve)
      .on("error", reject);
  });

/**
 * 32000 bytes ≈ 1 second (16kHz, mono, 16-bit)
 */
export const splitPCMChunks = (buffer, chunkSize = 32000) => {
  const chunks = [];
  for (let i = 44; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, i + chunkSize));
  }
  return chunks;
};

export async function processFullAudio(audioBuffer, socket, randomUid) {
  const tmpDir = "./temp";
  fs.mkdirSync(tmpDir, { recursive: true });

  const input = path.join(tmpDir, `input.raw`);
  const output = path.join(tmpDir, `output.wav`);

  fs.writeFileSync(input, audioBuffer);

  await new Promise((res, rej) => {
    ffmpeg(input)
      .audioFrequency(16000)
      .audioChannels(1)
      .toFormat("wav")
      .on("end", res)
      .on("error", rej)
      .save(output);
  });

  const wavBuffer = fs.readFileSync(output);
  await transcribeAndAnswer(wavBuffer, socket, randomUid);

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

export async function handleChunk(socket, responseId, data, isAudio) {
  // const pcm = Buffer.from(data);
  // socket.session.pcmChunks.push(pcm);
  // socket.session.chunkCounter++;
  // if (socket.session.chunkCounter % 10 === 0) {
  //   await transcribeAndEmit(socket, false, isAudio);
  // }
  if (!socket.session.responses.has(responseId)) {
    socket.session.responses.set(responseId, {
      pcmChunks: [],
      chunkCounter: 0,
      lastTranscript: "",
      audioSeq: 0,
    });
  }
  const responseSession = socket.session.responses.get(responseId);
  responseSession.pcmChunks.push(Buffer.from(data));
  responseSession.chunkCounter++;
  if (responseSession.chunkCounter % 10 === 0) {
    await transcribeAndEmit(socket, responseId, false, isAudio);
  }
}

export async function finalizeAudio(socket, responseId, isAudio) {
  await transcribeAndEmit(socket, responseId, true, isAudio);
}
const openai = new OpenAI(openaiConfig);

async function transcribeAndEmit(socket, responseId, isFinal, isAudio) {
  // const pcmBuffer = Buffer.concat(socket.session.pcmChunks);
  // const wavBuffer = createWavBuffer(pcmBuffer);
  // const file = new File([wavBuffer], "audio.wav", {
  //   type: "audio/wav",
  // });
  // const res = await openai.audio.transcriptions.create({
  //   model: "gpt-4o-transcribe",
  //   file,
  // });
  // const text = res.text || "";
  // const newText = text.slice(socket.session.lastTranscript.length).trim();
  // socket.session.lastTranscript = text;
  // const randomUid = Math.random().toString(36).substring(2, 32);
  // if (isFinal) {
  //   console.log("ENter here ", { text });
  //   await getAnswerFromTextFromStrem(text, socket, randomUid, isAudio);
  // }
  const responseSession = socket.session.responses.get(responseId);
  if (!responseSession) return;
  const pcmBuffer = Buffer.concat(responseSession.pcmChunks);
  const wavBuffer = createWavBuffer(pcmBuffer);
  const file = new File([wavBuffer], "audio.wav", {
    type: "audio/wav",
  });
  const res = await openai.audio.transcriptions.create({
    model: "gpt-4o-transcribe",
    file,
  });
  const text = res.text || "";
  const newText = text.slice(responseSession.lastTranscript.length).trim();
  responseSession.lastTranscript = text;
  const randomUid = Math.random().toString(36).substring(2, 32);
  if (isFinal) {
    console.log("ENter here ", { text });
    await getAnswerFromTextFromStrem(text, socket, responseId, isAudio);
  }
}
